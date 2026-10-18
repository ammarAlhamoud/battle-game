import { content } from './content/index.js';
import { applyCommand, createBattle, stepBattle } from './sim/engine.js';
import type { BattleState, WorkerInput, WorkerOutput } from './contracts.js';

let state: BattleState | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const send = (message: WorkerOutput): void => self.postMessage(message);
function stop(): void { if (timer !== null) clearInterval(timer); timer = null; }
function snapshot(requestId?: number): void { if (state) send({ type: 'state', state, ...(requestId === undefined ? {} : { requestId }) }); }
self.onmessage = (event: MessageEvent<WorkerInput>): void => {
  try {
    const message = event.data;
    if (message.type === 'stop') { stop(); state = null; return; }
    if (message.type === 'init') {
      stop();
      const mission = content.missions.find(m => m.id === message.missionId);
      if (!mission) throw new Error('Unknown mission.');
      state = message.restored ?? createBattle(mission, content, message.skills);
      if (!message.restored && message.startPaused) state.paused = true;
      snapshot();
      // A fixed 100 ms step keeps rules deterministic and independent of rendering.
      timer = setInterval(() => {
        try {
          if (state && !state.ended && !state.paused) stepBattle(state, content, 0.1);
          snapshot();
        } catch (error) {
          stop();
          send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      }, 100);
    } else if (message.type === 'command' && state) {
      applyCommand(state, message.command, content);
      snapshot();
    } else if (message.type === 'snapshot') snapshot(message.requestId);
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
