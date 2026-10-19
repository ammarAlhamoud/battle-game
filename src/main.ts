import { content, validateContent } from './content/index.js';
import { applyCommand } from './sim/engine.js';
import { mountUI } from './ui/index.js';
import { buySkill, createCampaign, exportSave, finishMission, importSave, isMissionUnlocked, loadGame, respec, saveGame, validateSave } from './persistence/index.js';
import { downloadAllEras, registerOffline } from './offline.js';
import { SimulationSession } from './lifecycle.js';
import type { BattleState, Campaign, SaveData } from './contracts.js';
import type { GameUI } from './ui-contract.js';

const parent = document.querySelector<HTMLElement>('#app')!;
type Phase = 'campaign' | 'starting' | 'battle' | 'leaving' | 'results' | 'importing';

async function boot(): Promise<void> {
  const errors = validateContent(content);
  if (errors.length) throw new Error(`Content validation failed: ${errors.join('; ')}`);
  let campaign: Campaign = createCampaign();
  let battle: BattleState | null = null;
  let session: SimulationSession | null = null;
  let phase: Phase = 'campaign';
  let epoch = 0;
  let resultHandled = false;
  let lastAutosave = 0;
  let saving: Promise<void> = Promise.resolve();
  let ui: GameUI;
  let recoveryMessage = '';
  try {
    const saved = await loadGame();
    if (saved) { const valid = validateSave(saved, content); campaign = valid.campaign; battle = valid.battle; }
  } catch (error) {
    recoveryMessage = `Save could not be restored: ${error instanceof Error ? error.message : String(error)}. You can import a backup.`;
  }
  const legacyDifficulty = (savedCampaign: Campaign, savedBattle: BattleState | null): void => {
    savedCampaign.difficulty ??= 'veteran';
    if (savedBattle) { savedBattle.difficulty ??= 'veteran'; savedBattle.aiGraceUntil ??= 0; }
  };
  legacyDifficulty(campaign, battle);
  const saveData = (): SaveData => ({ version: 1, savedAt: Date.now(), campaign, battle });
  const persistSnapshot = (data: SaveData): Promise<void> => {
    const snapshot = structuredClone(data);
    saving = saving.catch(() => undefined).then(() => saveGame(snapshot));
    return saving;
  };
  const persist = (): Promise<void> => persistSnapshot(saveData());
  const stopSession = (expected = session): void => {
    if (!expected) return;
    expected.close();
    if (session === expected) session = null;
  };
  const recover = (error: unknown, token: number, fallback: BattleState | null): void => {
    if (epoch !== token) return;
    stopSession();
    const recoveryEpoch = ++epoch;
    battle = fallback ? structuredClone(fallback) : null;
    if (battle && !battle.ended) battle.paused = true;
    phase = 'campaign';
    ui.setCampaign(campaign, battle); ui.showCampaign();
    ui.notify(`Simulation stopped: ${error instanceof Error ? error.message : String(error)}. Your last available battle snapshot was preserved.`);
    void persist().catch(saveError => { if (epoch === recoveryEpoch) ui.notify(`Save failed: ${String(saveError)}`); });
  };
  const getLatest = async (expected = session, token = epoch): Promise<void> => {
    if (!expected) return;
    const latest = await expected.snapshot();
    if (epoch !== token || (session !== expected && !latest.ended)) throw new Error('The battle changed while its snapshot was being requested. Please retry.');
    battle = latest;
  };
  const transitionBusy = (): boolean => phase === 'starting' || phase === 'leaving' || phase === 'importing';
  ui = mountUI({
    parent, content, campaign, savedBattle: battle,
    onStart(missionId, resume) {
      if (phase === 'battle' || transitionBusy()) return;
      if (!isMissionUnlocked(campaign, missionId, content)) { ui.notify('Complete the preceding battle to unlock this mission.'); return; }
      const previousBattle = battle;
      const restored = resume && battle !== null && battle.missionId === missionId && !battle.ended ? structuredClone(battle) : undefined;
      stopSession();
      const token = ++epoch;
      phase = 'starting'; resultHandled = false; lastAutosave = 0;
      battle = restored ?? null;
      try {
        ui.beginBattle(missionId);
        const transport = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        const created = new SimulationSession(transport, {
          onState(state) {
            if (epoch !== token || session !== created) return;
            battle = state;
            if (phase === 'starting') phase = 'battle';
            ui.setState(state);
            if (state.ended && !resultHandled) {
              resultHandled = true;
              const leaving = phase === 'leaving';
              if (!leaving) phase = 'results';
              stopSession(created);
              const results = finishMission(campaign, state, content);
              ui.setCampaign(campaign, battle);
              void persist().then(() => { if (epoch === token && phase === 'results') ui.showResults(results); }).catch(error => {
                if (epoch !== token || phase !== 'results') return;
                ui.notify(`Save failed: ${String(error)}`); ui.showResults(results);
              });
            } else if (Date.now() - lastAutosave >= 5000) {
              lastAutosave = Date.now();
              void persist().catch(error => { if (epoch === token) ui.notify(`Autosave failed: ${String(error)}`); });
            }
          },
          onError(error) { if (epoch === token && session === created) recover(error, token, created.lastState ?? restored ?? previousBattle); },
        });
        session = created;
        created.initialize({ type: 'init', missionId, skills: campaign.skills, restored, startPaused: campaign.tutorial && !restored, difficulty: campaign.difficulty ?? 'relaxed' });
      } catch (error) { recover(error, token, restored ?? previousBattle); }
    },
    onCommand(command) { if (phase === 'battle') session?.command(command); },
    onBuySkill(id) {
      if (transitionBusy() || phase === 'battle') return 'Finish the current battle or transition before purchasing skills.';
      if (battle && !battle.ended) return 'Finish the saved battle before purchasing skills. Its original army must remain consistent.';
      const error = buySkill(campaign, id, content);
      if (!error) { ui.setCampaign(campaign, battle); void persist().catch(e => ui.notify(`Save failed: ${String(e)}`)); }
      return error;
    },
    onRespec() {
      if (transitionBusy() || phase === 'battle') return 'Finish the current battle or transition before resetting skills.';
      if (battle && !battle.ended) return 'Finish the saved battle before resetting skills.';
      const error = respec(campaign, content);
      // A completed army is historical: its old purchased-skill roster no longer
      // describes the newly reset campaign. Results remain in campaign.records.
      if (!error) { if (battle?.ended) battle = null; ui.setCampaign(campaign, battle); void persist().catch(e => ui.notify(`Save failed: ${String(e)}`)); }
      return error;
    },
    async onExport() {
      if (phase === 'importing') throw new Error('Wait for the save import to finish.');
      const token = epoch;
      await getLatest();
      if (token !== epoch) throw new Error('The battle changed before export. Please retry.');
      const file = exportSave(saveData());
      const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = 'eightfold-save.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    onLanguageChange(language) {
      campaign.language = language;
      ui.setCampaign(campaign, battle);
      if (phase !== 'importing') void persist().catch(error => ui.notify(`Save failed: ${String(error)}`));
    },
    async onDifficultyChange(difficulty) {
      if (transitionBusy()) throw new Error('Wait for the current transition before changing difficulty.');
      const token = epoch, expected = session;
      if (phase === 'battle' && expected?.ready) {
        expected.command({ type: 'difficulty', value: difficulty });
        await getLatest(expected, token);
      } else if (battle && !battle.ended) applyCommand(battle, { type: 'difficulty', value: difficulty }, content);
      if (epoch !== token) throw new Error('The battle changed before difficulty was saved. Please retry.');
      campaign.difficulty = difficulty;
      ui.setCampaign(campaign, battle);
      await persist();
    },
    async onImport(file) {
      if (phase !== 'campaign' && phase !== 'results') throw new Error('Return to the campaign before importing a save.');
      phase = 'importing';
      const token = ++epoch;
      try {
        const imported = await importSave(file, content);
        legacyDifficulty(imported.campaign, imported.battle);
        // Publish the imported campaign only after its complete snapshot commits.
        // A quota/permission failure leaves both the visible and live campaign intact.
        await persistSnapshot({ ...imported, savedAt: Date.now() });
        if (epoch !== token) return;
        stopSession(); campaign = imported.campaign; battle = imported.battle;
        phase = 'campaign'; ui.setCampaign(campaign, battle); ui.showCampaign(); ui.notify('Campaign and battle snapshot restored.');
      } finally { if (epoch === token && phase === 'importing') phase = 'campaign'; }
    },
    onOffline: downloadAllEras,
    async onSave() {
      if (phase === 'importing') throw new Error('Wait for the save import to finish.');
      const token = epoch;
      await getLatest();
      if (token !== epoch) throw new Error('The battle changed before saving. Please retry.');
      await persist();
      if (token === epoch) ui.notify('Campaign and full battle snapshot saved.');
    },
    onLeave() {
      if (phase === 'leaving' || phase === 'importing') return;
      const token = epoch, expected = session, fallback = battle;
      phase = 'leaving';
      void (async () => {
        if (expected?.ready) {
          if (battle && !battle.ended) expected.command({ type: 'pause', value: true });
          await getLatest(expected, token);
        }
        if (epoch !== token) return;
        stopSession(expected);
        if (battle && !battle.ended) battle.paused = true;
        await persist();
        if (epoch !== token) return;
        phase = 'campaign'; ui.setCampaign(campaign, battle); ui.showCampaign();
      })().catch(error => { if (epoch === token) recover(error, token, expected?.lastState ?? fallback); });
    },
  });
  if (recoveryMessage) ui.notify(recoveryMessage);
  document.addEventListener('visibilitychange', () => {
    const expected = session, token = epoch;
    if (document.hidden && expected?.ready && battle && !battle.paused && !battle.ended) {
      expected.command({ type: 'pause', value: true });
      void getLatest(expected, token).then(() => { if (epoch === token) return persist(); }).catch(() => undefined);
    }
  });
  window.addEventListener('pagehide', () => { if (phase !== 'importing') void persist().catch(() => undefined); });
  void registerOffline();
}
void boot().catch(error => {
  console.error(error);
  const message = document.createElement('div');
  message.style.cssText = 'padding:3rem;background:#f4f1e8;color:#182c28;font:18px system-ui;min-height:100vh';
  message.textContent = `Eightfold could not start: ${error instanceof Error ? error.message : String(error)}. Reload or restore a valid save.`;
  parent.replaceChildren(message);
});
