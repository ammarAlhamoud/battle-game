import { content, validateContent } from './content/index.js';
import { mountUI } from './ui/index.js';
import { buySkill, createCampaign, exportSave, finishMission, importSave, isMissionUnlocked, loadGame, respec, saveGame, validateSave } from './persistence/index.js';
import { downloadAllEras, registerOffline } from './offline.js';
import type { BattleState, Campaign, SaveData, WorkerInput, WorkerOutput } from './contracts.js';
import type { GameUI } from './ui-contract.js';

const parent = document.querySelector<HTMLElement>('#app')!;
async function boot(): Promise<void> {
  const errors = validateContent(content);
  if (errors.length) throw new Error(`Content validation failed: ${errors.join('; ')}`);
  let campaign: Campaign = createCampaign();
  let battle: BattleState | null = null;
  let worker: Worker | null = null;
  let inBattle = false;
  let resultHandled = false;
  let lastAutosave = 0;
  let saving: Promise<void> = Promise.resolve();
  let ui: GameUI;
  let recoveryMessage = '';
  const snapshotListeners = new Set<(state: BattleState) => void>();
  try {
    const saved = await loadGame();
    if (saved) { const valid = validateSave(saved, content); campaign = valid.campaign; battle = valid.battle; }
  } catch (error) {
    recoveryMessage = `Save could not be restored: ${error instanceof Error ? error.message : String(error)}. You can import a backup.`;
  }
  const saveData = (): SaveData => ({ version: 1, savedAt: Date.now(), campaign, battle });
  const persist = (): Promise<void> => {
    const snapshot = structuredClone(saveData());
    saving = saving.catch(() => undefined).then(() => saveGame(snapshot));
    return saving;
  };
  const send = (message: WorkerInput): void => worker?.postMessage(message);
  const stopWorker = (): void => { if (worker) { send({ type: 'stop' }); worker.terminate(); worker = null; } };
  const getLatest = async (): Promise<void> => {
    if (!worker) return;
    await new Promise<void>(resolve => {
      const receive = (state: BattleState): void => { battle = state; clearTimeout(timeout); snapshotListeners.delete(receive); resolve(); };
      const timeout = window.setTimeout(() => { snapshotListeners.delete(receive); resolve(); }, 1500);
      snapshotListeners.add(receive);
      send({ type: 'snapshot' });
    });
  };
  ui = mountUI({
    parent, content, campaign, savedBattle: battle,
    onStart(missionId, resume) {
      if (!isMissionUnlocked(campaign, missionId, content)) { ui.notify('Complete the preceding battle to unlock this mission.'); return; }
      const restored = resume && battle !== null && battle.missionId === missionId && !battle.ended ? structuredClone(battle) : undefined;
      stopWorker();
      inBattle = true; resultHandled = false;
      ui.beginBattle(missionId);
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onerror = event => ui.notify(`Simulation error: ${event.message}`);
      worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
        const message = event.data;
        if (message.type === 'error') { ui.notify(message.message); return; }
        battle = message.state;
        for (const listener of snapshotListeners) listener(battle);
        ui.setState(battle);
        if (battle.ended && !resultHandled) {
          resultHandled = true;
          inBattle = false;
          stopWorker();
          const results = finishMission(campaign, battle, content);
          ui.setCampaign(campaign, battle);
          void persist().then(() => ui.showResults(results)).catch(error => { ui.notify(`Save failed: ${String(error)}`); ui.showResults(results); });
        } else if (Date.now() - lastAutosave >= 5000) {
          lastAutosave = Date.now();
          void persist().catch(error => ui.notify(`Autosave failed: ${String(error)}`));
        }
      };
      send({ type: 'init', missionId, skills: campaign.skills, restored });
    },
    onCommand(command) { send({ type: 'command', command }); },
    onBuySkill(id) {
      if (battle && !battle.ended) return 'Finish the saved battle before purchasing skills. Its original army must remain consistent.';
      const error = buySkill(campaign, id, content, inBattle);
      if (!error) { ui.setCampaign(campaign, battle); void persist().catch(e => ui.notify(`Save failed: ${String(e)}`)); }
      return error;
    },
    onRespec() {
      if (battle && !battle.ended) return 'Finish the saved battle before resetting skills.';
      const error = respec(campaign, content, inBattle);
      if (!error) { ui.setCampaign(campaign, battle); void persist().catch(e => ui.notify(`Save failed: ${String(e)}`)); }
      return error;
    },
    async onExport() {
      await getLatest();
      const file = exportSave(saveData());
      const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = 'eightfold-save.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async onImport(file) {
      if (inBattle) throw new Error('Return to the campaign before importing a save.');
      const imported = await importSave(file, content);
      stopWorker();
      campaign = imported.campaign; battle = imported.battle;
      await persist();
      ui.setCampaign(campaign, battle); ui.showCampaign(); ui.notify('Campaign and battle snapshot restored.');
    },
    onOffline: downloadAllEras,
    async onSave() { await getLatest(); await persist(); ui.notify('Campaign and full battle snapshot saved.'); },
    onLeave() {
      void (async () => {
        if (worker && battle && !battle.ended) send({ type: 'command', command: { type: 'pause', value: true } });
        await getLatest(); stopWorker(); inBattle = false;
        await persist(); ui.setCampaign(campaign, battle); ui.showCampaign();
      })().catch(error => { stopWorker(); inBattle = false; ui.showCampaign(); ui.notify(`Save failed: ${String(error)}`); });
    },
  });
  if (recoveryMessage) ui.notify(recoveryMessage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && worker && battle && !battle.paused && !battle.ended) {
      send({ type: 'command', command: { type: 'pause', value: true } });
      void getLatest().then(persist).catch(() => undefined);
    }
  });
  window.addEventListener('pagehide', () => { void persist(); });
  void registerOffline();
}
void boot().catch(error => {
  console.error(error);
  const message = document.createElement('div');
  message.style.cssText = 'padding:3rem;background:#f4f1e8;color:#182c28;font:18px system-ui;min-height:100vh';
  message.textContent = `Eightfold could not start: ${error instanceof Error ? error.message : String(error)}. Reload or restore a valid save.`;
  parent.replaceChildren(message);
});
