import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { content } from '../.test-build/src/content/index.js';
import { createBattle, RULES } from '../.test-build/src/sim/engine.js';
import { createCampaign, finishMission, buySkill, validateSave } from '../.test-build/src/persistence/index.js';
import { checkTarget } from '../.test-build/src/sim/targeting.js';
// Run npm test first, then use the Vite dev server. Fixtures stay in disposable contexts.
const base = (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const output = 'test-results/pro-tactics';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
const errors = [], checks = [];
let page;
const pass = name => { checks.push(name); console.log(`PASS ${name}`); };
async function waitFor(fn, message, timeout = 12000) { const until = Date.now() + timeout; while (Date.now() < until) {
    if (await fn())
        return;
    await page.waitForTimeout(100);
} throw Error(message); }
async function shot(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: true, animations: 'disabled' }); }
async function readSave() { return page.evaluate(() => new Promise((resolve, reject) => { const r = indexedDB.open('eightfold-saves', 1); r.onsuccess = () => { const db = r.result; const tx = db.transaction('snapshots'); const get = tx.objectStore('snapshots').get('current'); tx.oncomplete = () => { db.close(); resolve(get.result); }; tx.onerror = () => reject(tx.error); }; })); }
async function snapshot() { const started = await page.evaluate(() => Date.now()); await page.locator('button[title="Battle menu"]').click(); await page.getByRole('button', { name: 'Save now', exact: true }).click(); await waitFor(async () => (await readSave())?.savedAt >= started, 'save did not commit'); await page.keyboard.press('Escape'); return readSave(); }
async function miniPoint(point) { const b = await page.getByTestId('minimap').boundingBox(); await page.mouse.click(b.x + b.width * point.x / mission.map[0].length, b.y + b.height * point.y / mission.map.length); }
async function coordinates(x, y) { await page.getByTestId('target-coordinates').click(); await page.getByLabel('MAP X', { exact: true }).fill(String(x)); await page.getByLabel('MAP Y', { exact: true }).fill(String(y)); await page.getByRole('button', { name: 'Confirm target', exact: true }).click(); }
const campaign = createCampaign();
for (const mission of content.missions) {
    const b = createBattle(mission, content, [], []);
    b.ended = true;
    b.winner = 0;
    b.factions[0].score = 20000;
    finishMission(campaign, b, content);
}
for (let i = 0; i < content.skills.length; i++)
    for (const skill of content.skills)
        if (!campaign.skills.includes(skill.id))
            buySkill(campaign, skill.id, content);
campaign.tutorial = false;
const mission = content.missions.find(m => m.era === 3 && m.roster.includes('engineer'));
const battle = createBattle(mission, content, campaign.skills, []);
battle.paused = true;
const engineer = battle.units.find(u => u.owner === 0);
engineer.defId = content.eras[mission.era].units.find(d => d.role === 'engineer').id;
engineer.hp = content.eras[mission.era].units.find(d => d.role === 'engineer').hp;
const fixture = validateSave({ version: 1, savedAt: Date.now(), campaign, battle }, content);
const main = battle.strongholds.find(s => s.owner === 0 && s.kind === 'main');
const clear = [];
for (let y = 0; y < mission.map.length; y++)
    for (let x = 0; x < mission.map[0].length; x++) {
        const result = checkTarget(battle, content, { kind: 'tower', ids: [engineer.id] }, { x, y });
        if (result.valid)
            clear.push(result);
    }
clear.sort((a, b) => Math.hypot(a.point.x - engineer.x, a.point.y - engineer.y) - Math.hypot(b.point.x - engineer.x, b.point.y - engineer.y));
assert.ok(clear.length);
const build = clear[0];
try {
    const intro = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await intro.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByTestId('start-battle').click();
    await page.locator('#battle-viewport[data-renderer=ready]').waitFor();
    await waitFor(async () => await page.getByTestId('pause').getAttribute('aria-pressed') === 'true', 'tutorial did not start paused');
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('[data-stat=time] strong').innerText(), '00:00');
    await shot('01-tutorial-paused');
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await page.getByTestId('pause').click();
    assert.equal((await snapshot()).battle.paused, true);
    await page.getByTestId('pause').click();
    await waitFor(async () => await page.getByTestId('pause').getAttribute('aria-pressed') === 'false', 'tutorial did not hand over live play');
    pass('first tutorial freezes before tick one and rapid dismissal/pause preserves the latest requested state');
    await intro.close();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(save => new Promise((resolve, reject) => { const open = indexedDB.open('eightfold-saves', 1); open.onsuccess = () => { const db = open.result; const tx = db.transaction('snapshots', 'readwrite'); tx.objectStore('snapshots').put(save, 'current'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); }; }), fixture);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByTestId('resume-battle').click();
    await page.locator('#battle-viewport[data-renderer=ready]').waitFor();
    await page.getByTestId('battle-intel').waitFor();
    await shot('02-field-objectives');
    await page.getByRole('button', { name: 'Select all soldiers', exact: true }).click();
    await page.keyboard.press('a');
    await page.getByTestId('targeting-bar').waitFor();
    const viewport = await page.locator('#battle-viewport').boundingBox();
    await page.mouse.move(viewport.x + viewport.width * .6, viewport.y + viewport.height * .55);
    await shot('03-attack-move');
    await miniPoint({ x: main.x + 3, y: main.y - 2 });
    await waitFor(async () => await page.locator('.order-list li').count() === 1, 'attackmove order missing');
    let saved = await snapshot();
    assert.ok(saved.battle.units.filter(u => u.owner === 0).every(u => u.orders[0]?.kind === 'attack' && !u.orders[0].target));
    pass('A plus field/minimap target issues targetless attack-move without changing selection');
    const before = saved.battle.factions[0].resources;
    await page.keyboard.press('r');
    await coordinates(mission.map[0].length - 2, 1);
    assert.match(await page.locator('.target-error').innerText(), /vision/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByTestId('targeting-bar').count(), 0);
    assert.equal((await snapshot()).battle.factions[0].resources, before);
    pass('invalid rally is explained; Escape cancels targeting without spending supplies');
    await page.keyboard.press('t');
    await page.mouse.move(viewport.x + viewport.width * .56, viewport.y + viewport.height * .35);
    await shot('04-recon-preview');
    await miniPoint({ x: 15, y: 10 });
    await page.keyboard.press('t');
    await miniPoint({ x: 16, y: 10 });
    saved = await snapshot();
    const pending = Object.keys(saved.battle.factions[0].cooldowns).filter(k => k.startsWith('pending:recon:'));
    assert.equal(pending.length, 1);
    assert.ok(Math.abs(Number(pending[0].split(':')[2].split(',')[0]) - 16) < 1e-3);
    assert.equal(saved.battle.factions[0].resources, before);
    await page.getByTestId('pause').click();
    await page.waitForTimeout(350);
    await page.getByTestId('pause').click();
    saved = await snapshot();
    assert.equal(saved.battle.factions[0].resources, before - RULES.abilityCosts.recon);
    assert.ok(Object.keys(saved.battle.factions[0].cooldowns).some(k => k.startsWith('reveal:') && Math.abs(Number(k.slice(7).split(',')[0]) - 16) < 1e-3));
    pass('retargeted recon plans execute at the latest point and charge exactly once on resume');
    await page.getByRole('button', { name: 'Build tower', exact: true }).click();
    await coordinates(main.x, main.y);
    assert.match(await page.locator('.target-error').innerText(), /strongholds/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Build tower', exact: true }).click();
    await coordinates(build.point.x, build.point.y);
    assert.equal(await page.getByTestId('targeting-bar').count(), 0);
    await page.getByTestId('pause').click();
    await waitFor(async () => { const text = await page.locator('[data-stat=supplies] strong').innerText(); return Number(text.replaceAll(',', '')) === before - RULES.abilityCosts.recon - build.cost; }, 'engineer did not begin construction', 18000);
    await page.getByTestId('pause').click();
    saved = await snapshot();
    assert.ok(saved.battle.structures.some(s => s.kind === 'tower' && s.x === build.point.x && s.y === build.point.y));
    pass('build targeting rejects stronghold overlap and a real engineer travels to a valid discounted site');
    await page.getByRole('button', { name: 'Unit dossier', exact: true }).click();
    assert.ok(await page.getByRole('heading', { name: 'Strong against', exact: true }).count());
    assert.equal(await page.locator('.dossier-terrain .stat').count(), 4);
    await shot('05-unit-dossier');
    await page.keyboard.press('Escape');
    await page.keyboard.press('h');
    await page.getByRole('button', { name: 'Army guide', exact: true }).click();
    assert.equal(await page.locator('.dossier-entry').count(), content.eras[mission.era].units.length);
    await page.keyboard.press('Escape');
    pass('unit dossier exposes counters, ability costs and terrain; army guide includes the era roster');
    await page.getByTestId('battle-settings').click();
    await page.getByTestId('language-ar').click();
    await page.keyboard.press('Escape');
    await shot('06-arabic-field');
    await page.setViewportSize({ width: 768, height: 900 });
    await shot('07-arabic-compact');
    const intel = await page.getByTestId('battle-intel').boundingBox(), controls = await page.locator('.map-controls').boundingBox();
    assert.ok(intel.x + intel.width <= controls.x || controls.x + controls.width <= intel.x || intel.y + intel.height <= controls.y || controls.y + controls.height <= intel.y, 'Arabic intel overlaps map controls');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'تحديد جميع الجنود', exact: true }).click();
    await page.keyboard.press('a');
    await page.getByTestId('targeting-bar').waitFor();
    assert.equal(await page.getByTestId('targeting-bar').evaluate(el => getComputedStyle(el).direction), 'rtl');
    await shot('08-arabic-targeting');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'بطاقة الوحدة', exact: true }).click();
    await page.locator('.unit-dossier').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.dossier-hero .eyebrow').innerText(), 'هندسة');
    assert.equal(await page.locator('.counter-row').first().locator('span').innerText(), 'حصار');
    await shot('09-arabic-dossier');
    await page.keyboard.press('Escape');
    assert.deepEqual(await page.evaluate(async () => [...(await import('/src/i18n/index.ts')).missingTranslations]), []);
    pass('new tactical controls and dossiers translate live to Arabic and remain contained at 768px');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByTestId('battle-settings').click();
    await page.getByTestId('language-en').click();
    await page.keyboard.press('Escape');
    await page.locator('button[title="Battle menu"]').click();
    await page.getByRole('button', { name: 'Return to campaign', exact: true }).click();
    await page.getByRole('button', { name: 'Save & return to campaign', exact: true }).click();
    await page.getByTestId('start-battle').waitFor();
    await page.getByTestId('start-battle').click();
    await page.getByRole('dialog', { name: 'Replace the saved battle?' }).waitFor();
    await page.getByRole('button', { name: 'Keep saved battle', exact: true }).click();
    assert.ok(await page.getByTestId('resume-battle').count());
    pass('starting another attempt requires an explicit saved-battle replacement choice');
    assert.deepEqual(errors, []);
    await writeFile(`${output}/report.json`, JSON.stringify({ checks, errors, timestamp: new Date().toISOString() }, null, 2));
}
catch (error) {
    console.error(error);
    if (page)
        await shot('failure').catch(() => { });
    process.exitCode = 1;
}
finally {
    await browser.close();
}
