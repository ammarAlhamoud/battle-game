import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { content } from '../.test-build/src/content/index.js';
import { applyCommand, createBattle } from '../.test-build/src/sim/engine.js';
import { buySkill, createCampaign, finishMission, validateSave } from '../.test-build/src/persistence/index.js';

// Run npm test first and keep Vite running. Every save lives in a fresh isolated
// browser context. The paused fixture is synthetic; no real user's save is read.
const base = (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const output = 'test-results/difficulty';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
const checks = [], errors = [], snapshots = [];
let page;
const pass = name => { checks.push(name); console.log('PASS ' + name); };
async function waitFor(predicate, message, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await predicate()) return; await page.waitForTimeout(80); }
  throw new Error(message);
}
async function saved() {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('eightfold-saves', 1); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('snapshots'), request = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(request.result || null); };
      tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function shot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled', timeout: 15_000 }); }
async function openSettings(battle = false) { await page.getByTestId(battle ? 'battle-settings' : 'difficulty-settings').click(); await page.getByTestId('difficulty').waitFor(); }
async function choose(mode) {
  const started = Date.now();
  await page.getByTestId('difficulty').selectOption(mode);
  await waitFor(async () => await page.getByTestId('difficulty').isEnabled() && (await saved())?.campaign.difficulty === mode && (await saved()).savedAt >= started, 'difficulty preference did not commit: ' + mode);
  return saved();
}
async function language(code) {
  await page.getByTestId('language-' + code).click();
  await waitFor(async () => await page.locator('html').getAttribute('lang') === code && (await saved())?.campaign.language === code, 'language preference did not persist');
}
function ledger(save) {
  const { language: _language, difficulty: _difficulty, ...campaign } = save.campaign;
  return campaign;
}
function sameMilitaryState(before, after) {
  for (const key of ['version', 'missionId', 'seed', 'tick', 'time', 'paused', 'nextId', 'winner', 'ended']) assert.equal(after[key], before[key], key);
  for (const key of ['factions', 'strongholds', 'structures', 'fog', 'events', 'aiSides']) assert.deepEqual(after[key], before[key], key);
  assert.deepEqual(after.ai[0], before.ai[0]);
  assert.deepEqual(after.units.filter(u => u.owner === 0), before.units.filter(u => u.owner === 0), 'player positions, HP, orders and cooldowns');
  const military = units => units.filter(u => u.owner === 1).map(({ orders: _orders, route: _route, targetId: _target, status: _status, ...unit }) => unit);
  assert.deepEqual(military(after.units), military(before.units), 'enemy combat values and positions');
}
async function saveBattle() {
  const code = await page.locator('html').getAttribute('lang');
  const started = Date.now();
  await page.locator(code === 'ar' ? 'button[title="قائمة المعركة"]' : 'button[title="Battle menu"]').click();
  await page.getByRole('button', { name: code === 'ar' ? 'حفظ الآن' : 'Save now', exact: true }).click();
  await waitFor(async () => (await saved())?.savedAt >= started, 'manual battle snapshot did not commit');
  await page.keyboard.press('Escape'); return saved();
}
async function importFile(value, name) {
  const started = Date.now();
  await page.locator('input[type="file"]').first().setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await waitFor(async () => (await saved())?.savedAt >= started && (await saved())?.battle?.missionId === value.battle?.missionId, 'portable save import did not commit');
  await page.getByTestId('resume-battle').waitFor();
}
async function resume() {
  await page.getByTestId('resume-battle').click();
  await page.locator('#battle-viewport[data-renderer="ready"]').waitFor({ timeout: 30_000 });
  await page.getByTestId('difficulty-status').waitFor();
  await waitFor(async () => await page.getByTestId('pause').getAttribute('aria-pressed') === 'true', 'the saved battle did not remain paused');
}

const campaign = createCampaign(); campaign.difficulty = 'veteran'; campaign.tutorial = false;
const previous = createBattle(content.missions[0], content, [], [], 'veteran');
previous.ended = true; previous.winner = 0; previous.factions[0].score = content.missions[0].thresholds.at(-1);
finishMission(campaign, previous, content);
assert.equal(buySkill(campaign, 'discipline', content), null); assert.equal(buySkill(campaign, 'logistics', content), null);
const battle = createBattle(content.missions[0], content, campaign.skills, [1], 'veteran');
battle.paused = true; battle.time = 120; battle.tick = 1200;
const home = battle.strongholds.find(h => h.kind === 'main' && h.owner === 0), objective = battle.strongholds.find(h => h.kind !== 'main');
applyCommand(battle, { type: 'order', side: 0, ids: battle.units.filter(u => u.owner === 0).map(u => u.id), order: { kind: 'capture', x: objective.x, y: objective.y, target: objective.id } }, content);
applyCommand(battle, { type: 'order', side: 1, ids: battle.units.filter(u => u.owner === 1).map(u => u.id), order: { kind: 'capture', x: home.x, y: home.y, target: home.id } }, content);
applyCommand(battle, { type: 'recruit', side: 0, unitId: content.eras[0].units[0].id }, content);
battle.units.find(u => u.owner === 0).hp *= .8;
battle.factions[0].score = 310; battle.factions[1].score = 290;
battle.ai[1].objective = home.id; battle.ai[1].mode = 'attack'; battle.ai[1].nextRecruitAt = 130;
const fixture = validateSave({ version: 1, savedAt: 1000, campaign, battle }, content);

try {
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  page = await fresh.newPage(); page.setDefaultTimeout(20_000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await openSettings(); assert.equal(await page.getByTestId('difficulty').inputValue(), 'relaxed');
  assert.deepEqual(await page.getByTestId('difficulty').locator('option').allTextContents(), ['Relaxed (recommended)', 'Standard', 'Veteran']);
  const initial = { version: 1, campaign: createCampaign() };
  for (const mode of ['standard', 'veteran', 'relaxed']) assert.deepEqual(ledger(await choose(mode)), ledger(initial));
  await shot('01-difficulty-en'); pass('fresh campaigns default to Relaxed and all three English settings persist without changing progression');
  await language('ar');
  assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  const arabic = await page.getByTestId('difficulty').locator('option').allTextContents();
  assert.match(arabic[0], /مريح/); assert.match(arabic[1], /عادي/); assert.match(arabic[2], /مخضرم/);
  for (const mode of ['standard', 'veteran', 'relaxed']) assert.deepEqual(ledger(await choose(mode)), ledger(initial));
  await shot('02-difficulty-ar'); await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' }); await openSettings();
  assert.equal(await page.locator('html').getAttribute('lang'), 'ar'); assert.equal(await page.getByTestId('difficulty').inputValue(), 'relaxed');
  pass('Arabic labels and stable mode codes persist across reload while campaign records and skill points remain intact');
  await fresh.close();

  const active = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  page = await active.newPage(); page.setDefaultTimeout(20_000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' }); await importFile(fixture, 'paused-veteran.json'); await resume();
  const original = await saveBattle(); assert.deepEqual(original.battle, fixture.battle);
  await openSettings(true); await language('ar');
  let current = await choose('standard');
  sameMilitaryState(original.battle, current.battle); assert.deepEqual(ledger(current), ledger(original));
  assert.equal(current.battle.aiGraceUntil, original.battle.time + 20);
  assert.ok(current.battle.units.filter(u => u.owner === 1).every(u => !u.orders.some(o => o.kind === 'capture' && o.target === home.id)));
  current = await choose('relaxed');
  sameMilitaryState(original.battle, current.battle); assert.deepEqual(ledger(current), ledger(original));
  assert.equal(current.battle.aiGraceUntil, original.battle.time + 45); assert.equal(current.battle.paused, true);
  await shot('03-live-difficulty-ar'); await page.keyboard.press('Escape'); await shot('04-relaxed-preparation');
  snapshots.push({ phase: 'live-relaxed', time: current.battle.time, preparationDeadline: current.battle.aiGraceUntil, score: current.battle.factions[0].score });
  pass('easier live switches preserve full player state, both economies, score, production, fog and rewards while replacing enemy attack plans and granting 20/45 simulation seconds');

  await page.reload({ waitUntil: 'networkidle' }); await resume(); await page.waitForTimeout(400);
  const resumed = await saveBattle();
  assert.deepEqual(resumed.battle, current.battle); assert.deepEqual(ledger(resumed), ledger(original));
  assert.match(await page.getByTestId('difficulty-status').innerText(), /مريح/);
  assert.equal(await page.getByTestId('difficulty-status').locator('[data-difficulty-countdown]').isVisible(), true);
  pass('reloading and resuming retain the exact paused battle, mode and remaining preparation deadline');

  await openSettings(true); const veteran = await choose('veteran');
  sameMilitaryState(resumed.battle, veteran.battle); assert.deepEqual(ledger(veteran), ledger(original));
  assert.equal(veteran.battle.difficulty, 'veteran'); assert.ok(veteran.battle.aiGraceUntil <= veteran.battle.time);
  await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' }); await openSettings();
  assert.equal(await page.getByTestId('difficulty').inputValue(), 'veteran'); await page.keyboard.press('Escape');
  pass('explicit Veteran remains selected after a harder live switch and reload without resetting the army or campaign');

  const legacy = structuredClone(fixture); delete legacy.campaign.difficulty; delete legacy.battle.difficulty; delete legacy.battle.aiGraceUntil;
  for (const plan of legacy.battle.ai) delete plan.nextRecruitAt;
  await importFile(legacy, 'legacy-v1-no-difficulty.json');
  const imported = await saved();
  assert.equal(imported.version, 1); assert.equal(imported.campaign.difficulty, 'veteran'); assert.equal(imported.battle.difficulty, 'veteran'); assert.equal(imported.battle.aiGraceUntil, 0);
  assert.deepEqual(imported.battle.units, legacy.battle.units); assert.deepEqual(imported.battle.factions, legacy.battle.factions); assert.deepEqual(ledger(imported), ledger(original));
  await openSettings(); assert.equal(await page.getByTestId('difficulty').inputValue(), 'veteran');
  pass('legacy version-one imports remain Veteran and preserve old unit, resource and reward data');

  const dormant = await choose('relaxed');
  sameMilitaryState(imported.battle, dormant.battle); assert.deepEqual(ledger(dormant), ledger(original));
  assert.equal(dormant.battle.aiGraceUntil, dormant.battle.time + 45);
  await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'networkidle' }); await resume();
  assert.deepEqual((await saveBattle()).battle, dormant.battle);
  pass('changing difficulty for an unfinished saved battle applies before resume and does not create a new mission or restart its grace');

  await page.reload({ waitUntil: 'networkidle' }); await importFile(fixture, 'explicit-veteran-v1.json'); await openSettings();
  assert.equal(await page.getByTestId('difficulty').inputValue(), 'veteran');
  const explicit = await saved(); assert.equal(explicit.battle.difficulty, 'veteran'); assert.deepEqual(ledger(explicit), ledger(original));
  assert.deepEqual(explicit.campaign.records.e1m1.claimed, fixture.campaign.records.e1m1.claimed);
  pass('explicit Veteran portable saves retain their chosen mode and the existing one-time threshold reward ledger');
  await active.close();
  assert.deepEqual(errors, []);
  const report = { timestamp: new Date().toISOString(), browser: await browser.version(), base, checks, errors, snapshots };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await shot('failure').catch(() => undefined);
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, errors, snapshots, failure: error.stack || String(error) }, null, 2)); throw error;
} finally { await browser.close(); }
