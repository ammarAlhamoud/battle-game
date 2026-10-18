import test from 'node:test';
import assert from 'node:assert/strict';
import type { BattleState, WorkerInput, WorkerOutput } from '../src/contracts.js';
import { content } from '../src/content/index.js';
import { createBattle } from '../src/sim/engine.js';
import { SimulationSession, type WorkerPort } from '../src/lifecycle.js';

class FakeWorker {
  onmessage: WorkerPort['onmessage'] = null;
  onerror: WorkerPort['onerror'] = null;
  onmessageerror: WorkerPort['onmessageerror'] = null;
  messages: WorkerInput[] = [];
  terminated = 0;
  sendError: Error | null = null;
  postMessage(message: WorkerInput): void {
    if (this.sendError) throw this.sendError;
    this.messages.push(structuredClone(message));
  }
  terminate(): void { this.terminated++; }
  emit(message: WorkerOutput): void { this.onmessage?.call(this as unknown as Worker, { data: structuredClone(message) } as MessageEvent<WorkerOutput>); }
  error(message: string): void { this.onerror?.call(this as unknown as Worker, { message, preventDefault() {} } as ErrorEvent); }
  get port(): WorkerPort { return this as unknown as WorkerPort; }
}

function state(tick = 0): BattleState {
  const result = createBattle(content.missions[0], content, [], []);
  result.tick = tick; result.time = tick * .1;
  return result;
}
const init: Extract<WorkerInput, { type: 'init' }> = { type: 'init', missionId: 'e1m1', skills: [], startPaused: true };

test('a simulation session initializes once and accepts commands only after its first state', t => {
  const worker = new FakeWorker();
  const received: BattleState[] = [];
  const session = new SimulationSession(worker.port, { onState: s => received.push(s), onError: error => assert.fail(error.message) });
  t.after(() => session.close());
  session.command({ type: 'pause', value: true });
  assert.equal(worker.messages.length, 0);
  session.initialize(init);
  assert.deepEqual(worker.messages, [init]);
  assert.throws(() => session.initialize(init), /already been initialized/);
  assert.equal(session.ready, false);
  worker.emit({ type: 'state', state: state() });
  assert.equal(session.ready, true);
  assert.equal(received.length, 1);
  session.command({ type: 'pause', value: false });
  assert.equal(worker.messages.at(-1)?.type, 'command');
});

test('periodic states and unmatched request IDs cannot complete an explicit snapshot', async t => {
  const worker = new FakeWorker();
  const session = new SimulationSession(worker.port, { onState() {}, onError: error => assert.fail(error.message) });
  t.after(() => session.close());
  session.initialize(init); worker.emit({ type: 'state', state: state() });
  let settled = false;
  const snapshot = session.snapshot().then(value => { settled = true; return value; });
  const request = worker.messages.at(-1)!;
  assert.equal(request.type, 'snapshot');
  if (request.type !== 'snapshot') assert.fail('missing snapshot command');
  worker.emit({ type: 'state', state: state(1) });
  worker.emit({ type: 'state', state: state(2), requestId: 999 });
  await Promise.resolve(); assert.equal(settled, false);
  worker.emit({ type: 'state', state: state(3), requestId: request.requestId });
  assert.equal((await snapshot).tick, 3);
});

test('overlapping snapshot promises resolve only to their own matching reply', async t => {
  const worker = new FakeWorker();
  const session = new SimulationSession(worker.port, { onState() {}, onError: error => assert.fail(error.message) });
  t.after(() => session.close()); session.initialize(init); worker.emit({ type: 'state', state: state() });
  const first = session.snapshot(), second = session.snapshot();
  const requests = worker.messages.filter((m): m is Extract<WorkerInput, { type: 'snapshot' }> => m.type === 'snapshot');
  assert.notEqual(requests[0].requestId, requests[1].requestId);
  worker.emit({ type: 'state', state: state(20), requestId: requests[1].requestId });
  worker.emit({ type: 'state', state: state(10), requestId: requests[0].requestId });
  assert.equal((await first).tick, 10); assert.equal((await second).tick, 20);
});

test('closing a session rejects pending requests, detaches handlers and ignores queued old callbacks', async () => {
  const worker = new FakeWorker(), received: BattleState[] = [];
  const session = new SimulationSession(worker.port, { onState: s => received.push(s), onError: error => assert.fail(error.message) });
  session.initialize(init); worker.emit({ type: 'state', state: state() });
  const staleHandler = worker.onmessage!;
  const pending = assert.rejects(session.snapshot(), /session has closed/);
  session.close(); session.close();
  await pending;
  staleHandler.call(worker as unknown as Worker, { data: { type: 'state', state: state(100) } } as MessageEvent<WorkerOutput>);
  assert.equal(received.length, 1);
  assert.equal(session.ready, false);
  assert.equal(worker.terminated, 1);
  assert.equal(worker.onmessage, null); assert.equal(worker.onerror, null); assert.equal(worker.onmessageerror, null);
  await assert.rejects(session.snapshot(), /session has closed/);
});

test('worker error messages terminate once and preserve the last successful snapshot', async () => {
  const worker = new FakeWorker(), errors: Error[] = [];
  const session = new SimulationSession(worker.port, { onState() {}, onError: e => errors.push(e) });
  session.initialize(init); worker.emit({ type: 'state', state: state(7) });
  const pending = assert.rejects(session.snapshot(), /pathfinding failed/);
  worker.emit({ type: 'error', message: 'pathfinding failed' });
  await pending;
  worker.error('late failure');
  assert.equal(errors.length, 1); assert.equal(errors[0].message, 'pathfinding failed');
  assert.equal(worker.terminated, 1); assert.equal(session.lastState?.tick, 7);
});

test('an initialization timeout reports failure and closes an unresponsive worker', async () => {
  const worker = new FakeWorker();
  const failed = new Promise<Error>(resolve => {
    const session = new SimulationSession(worker.port, { onState() { assert.fail('unexpected state'); }, onError: resolve, startupTimeoutMs: 5 });
    session.initialize(init);
  });
  assert.match((await failed).message, /too long to load/);
  assert.equal(worker.terminated, 1);
});

test('a snapshot timeout rejects the save request without silently accepting stale state', async t => {
  const worker = new FakeWorker();
  const session = new SimulationSession(worker.port, { onState() {}, onError: error => assert.fail(error.message), snapshotTimeoutMs: 5 });
  t.after(() => session.close()); session.initialize(init); worker.emit({ type: 'state', state: state() });
  const missing = session.snapshot(); worker.emit({ type: 'state', state: state(1) });
  await assert.rejects(missing, /snapshot could not be obtained/);
  assert.equal(session.ready, true);
  const next = session.snapshot();
  const request = worker.messages.at(-1)!;
  if (request.type !== 'snapshot') assert.fail('missing retry request');
  worker.emit({ type: 'state', state: state(2), requestId: request.requestId });
  assert.equal((await next).tick, 2);
});

test('synchronous postMessage and worker decoding failures recover through the same error path', () => {
  const worker = new FakeWorker(), errors: Error[] = [];
  worker.sendError = new Error('worker import failed');
  const session = new SimulationSession(worker.port, { onState() {}, onError: e => errors.push(e) });
  session.initialize(init);
  assert.equal(errors[0].message, 'worker import failed'); assert.equal(worker.terminated, 1);
  const decodingWorker = new FakeWorker();
  const decodingSession = new SimulationSession(decodingWorker.port, { onState() {}, onError: e => errors.push(e) });
  decodingSession.initialize(init);
  decodingWorker.onmessageerror!.call(decodingWorker as unknown as Worker, {} as MessageEvent);
  assert.match(errors[1].message, /could not be decoded/); assert.equal(decodingWorker.terminated, 1);
});
