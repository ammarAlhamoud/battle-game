import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

// Run a Vite development server first, then: node scripts/qa-storage.mjs [URL]
// A fresh isolated context keeps this destructive-corruption test away from real saves.
const baseURL = (process.argv[2] || 'http://127.0.0.1:5173').replace(/\/$/, '');
const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : chromium.executablePath());
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  // A JavaScript document supplies the local origin without starting the game UI/autosaver.
  await page.goto(`${baseURL}/@vite/client`);
  const result = await page.evaluate(async () => {
    const persistence = await import('/src/persistence/index.ts');
    const { content } = await import('/src/content/index.ts');
    const engine = await import('/src/sim/engine.ts');
    const check = (value, label) => { if (!value) throw new Error(label); };
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const edit = (callback) => new Promise((resolve, reject) => {
      const request = indexedDB.open('eightfold-saves', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('snapshots', 'readwrite');
        callback(transaction.objectStore('snapshots'));
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
        transaction.onabort = () => { db.close(); reject(transaction.error || new Error('aborted')); };
      };
    });
    const records = () => new Promise((resolve, reject) => {
      const request = indexedDB.open('eightfold-saves', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('snapshots', 'readonly');
        const store = transaction.objectStore('snapshots');
        const current = store.get('current'); const previous = store.get('previous');
        transaction.oncomplete = () => { db.close(); resolve({ current: current.result, previous: previous.result }); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
    check(await persistence.loadGame() === null, 'fresh storage must return no save');
    const campaign = persistence.createCampaign();
    check(persistence.buySkill(campaign, 'discipline', content) === null, 'setup skill purchase');
    const battle = engine.createBattle(content.missions[0], content, campaign.skills, [0, 1]);
    engine.applyCommand(battle, { type: 'recruit', side: 0, unitId: content.eras[0].units[0].id }, content);
    for (let i = 0; i < 15; i++) engine.stepBattle(battle, content);
    engine.applyCommand(battle, { type: 'pause', value: true }, content);
    engine.applyCommand(battle, { type: 'order', side: 0, ids: [battle.units[0].id], order: { kind: 'move', x: 8, y: 16 } }, content);
    const a = { version: 1, savedAt: 100, campaign, battle };
    await persistence.saveGame(a);
    const first = await persistence.loadGame();
    check(equal(first, a), 'full IndexedDB snapshot round trip');
    const b = structuredClone(a); b.savedAt = 200; b.campaign.selectedEra = 1;
    await persistence.saveGame(b);
    const committed = await records();
    check(equal(committed.current, b) && equal(committed.previous, a), 'current/previous commit together');

    // The second record is deliberately malformed; recovery must use valid A.
    await edit(store => store.put({ version: 999, corrupt: true }, 'current'));
    check(equal(await persistence.loadGame(), a), 'invalid current must recover previous valid snapshot');
    const c = structuredClone(a); c.savedAt = 300; c.campaign.selectedEra = 2;
    await persistence.saveGame(c);
    const repaired = await records();
    check(equal(repaired.current, c) && equal(repaired.previous, a), 'new save after corruption must preserve the good backup');

    // IndexedDB abort rolls back both keys even after put requests were issued.
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('eightfold-saves', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('snapshots', 'readwrite');
        const store = transaction.objectStore('snapshots');
        store.put({ version: 999 }, 'current'); store.put({ version: 999 }, 'previous');
        transaction.onabort = () => { db.close(); resolve(); };
        transaction.oncomplete = () => { db.close(); reject(new Error('test transaction unexpectedly committed')); };
        transaction.abort();
      };
    });
    check(equal(await persistence.loadGame(), c), 'aborted transaction must leave the committed snapshot intact');

    const blob = persistence.exportSave(c);
    const portable = new File([blob], 'eightfold-save.json', { type: 'application/json' });
    const imported = await persistence.importSave(portable, content);
    check(equal(imported, c), 'portable export/import retains the complete battle');
    const d = structuredClone(c); d.savedAt = 400;
    const e = structuredClone(c); e.savedAt = 500;
    await Promise.all([persistence.saveGame(d), persistence.saveGame(e)]);
    check((await persistence.loadGame()).savedAt === 500, 'concurrent save requests preserve call order');
    const beforeRejected = await records();
    const invalid = structuredClone(e); invalid.campaign.points += 1000;
    let rejected = false;
    try { await persistence.saveGame(invalid); } catch { rejected = true; }
    check(rejected, 'invalid reward balances must be rejected before committing');
    check(equal(await records(), beforeRejected), 'invalid save must not change either committed record');
    await edit(store => { store.put({ version: 999 }, 'current'); store.put({ version: 999 }, 'previous'); });
    let corruptionReported = false;
    try { await persistence.loadGame(); } catch (error) { corruptionReported = String(error).includes('Both local save snapshots are invalid'); }
    check(corruptionReported, 'two invalid snapshots must report corruption rather than resetting the campaign');
    return {
      checks: 11, browser: navigator.userAgent,
      snapshotBytes: blob.size, units: c.battle.units.length,
      description: 'IndexedDB round trip, atomic snapshot pair, backup recovery, repair, abort rollback, portable import/export, ordered concurrent saves, invalid ledger protection and dual-corruption error',
    };
  });
  assert.equal(result.checks, 11);
  console.log(JSON.stringify(result, null, 2));
  await context.close();
} finally { await browser.close(); }
