import type { BattleState, Command, WorkerInput, WorkerOutput } from './contracts.js';

export type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;
interface SessionOptions {
  onState(state: BattleState): void;
  onError(error: Error): void;
  startupTimeoutMs?: number;
  snapshotTimeoutMs?: number;
}
interface PendingSnapshot {
  resolve(state: BattleState): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

/** One worker lifetime. Closed workers and unsolicited updates cannot complete a save request. */
export class SimulationSession {
  private readonly pending = new Map<number, PendingSnapshot>();
  private nextRequest = 1;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private initialized = false;
  private isReady = false;
  lastState: BattleState | null = null;

  constructor(private readonly worker: WorkerPort, private readonly options: SessionOptions) {
    worker.onmessage = event => this.receive(event.data as WorkerOutput);
    worker.onerror = event => { event.preventDefault?.(); this.fail(new Error(event.message || 'The simulation worker could not start.')); };
    worker.onmessageerror = () => this.fail(new Error('A simulation message could not be decoded. Return to the campaign and retry.'));
  }

  get ready(): boolean { return this.isReady && !this.closed; }

  initialize(message: Extract<WorkerInput, { type: 'init' }>): void {
    if (this.closed || this.initialized) throw new Error('This simulation session has already been initialized.');
    this.initialized = true;
    this.startupTimer = setTimeout(() => this.fail(new Error('The battlefield took too long to load. Please retry.')), this.options.startupTimeoutMs ?? 10_000);
    try { this.worker.postMessage(message); }
    catch (error) { this.fail(asError(error)); }
  }

  command(command: Command): void {
    if (!this.ready) return;
    try { this.worker.postMessage({ type: 'command', command } satisfies WorkerInput); }
    catch (error) { this.fail(asError(error)); }
  }

  snapshot(): Promise<BattleState> {
    if (this.closed) return Promise.reject(new Error('The battle session has closed.'));
    if (!this.ready) return Promise.reject(new Error('The battlefield is still loading. Please wait.'));
    const requestId = this.nextRequest++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('The current battle snapshot could not be obtained. Please retry.'));
      }, this.options.snapshotTimeoutMs ?? 2500);
      this.pending.set(requestId, { resolve, reject, timer });
      try { this.worker.postMessage({ type: 'snapshot', requestId } satisfies WorkerInput); }
      catch (error) { this.fail(asError(error)); }
    });
  }

  close(reason = new Error('The battle session has closed.')): void {
    if (this.closed) return;
    this.closed = true;
    this.isReady = false;
    if (this.startupTimer !== null) clearTimeout(this.startupTimer);
    this.startupTimer = null;
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate();
    for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(reason); }
    this.pending.clear();
  }

  private receive(message: WorkerOutput): void {
    if (this.closed) return;
    if (!message || (message.type !== 'state' && message.type !== 'error')) { this.fail(new Error('The simulation returned an invalid message.')); return; }
    if (message.type === 'error') { this.fail(new Error(message.message)); return; }
    if (!message.state || message.state.version !== 1) { this.fail(new Error('The simulation returned an invalid battle state.')); return; }
    this.isReady = true;
    if (this.startupTimer !== null) clearTimeout(this.startupTimer);
    this.startupTimer = null;
    this.lastState = message.state;
    if (message.requestId !== undefined) {
      const request = this.pending.get(message.requestId);
      if (request) { clearTimeout(request.timer); this.pending.delete(message.requestId); request.resolve(message.state); }
    }
    try { this.options.onState(message.state); }
    catch (error) { this.fail(asError(error)); }
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.close(error);
    this.options.onError(error);
  }
}

function asError(error: unknown): Error { return error instanceof Error ? error : new Error(String(error)); }
