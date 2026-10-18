import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.env.GAME_URL ?? 'http://127.0.0.1:4173';
const output = new URL('../test-results/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(20000);
const errors = [];
const checks = [];
page.on('pageerror', error => errors.push(error.message));
function pass(name) { checks.push(name); console.log(`PASS ${name}`); }
async function screenshot(name) { await page.screenshot({ path: new URL(`${name}.png`, output).pathname, fullPage: true, timeout: 10000 }); }
async function waitFor(fn, message, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) { if (await fn()) return; await page.waitForTimeout(150); }
  throw new Error(message);
}
async function currentSave() {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('eightfold-saves', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('snapshots', 'readonly');
      const request = tx.objectStore('snapshots').get('current');
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function menuSave() {
  await page.locator('button[title="Battle menu"]').click();
  await page.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForTimeout(350);
  await page.keyboard.press('Escape');
}
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('h1').filter({ hasText: 'The First Fires' }).waitFor();
  assert.equal(await page.locator('.era-tab').count(), 8);
  assert.equal(await page.locator('.mission-card').count(), 5);
  assert.equal(await page.locator('.mission-card.locked').count(), 4);
  pass('campaign has eight era tabs, five cards, and sequential locks');
  await screenshot('campaign');

  await page.getByTestId('skills').click();
  await page.locator('.skill-node').filter({ hasText: 'Common discipline' }).click();
  await page.locator('.skill-detail').getByRole('button', { name: 'Learn · 1 SP' }).click();
  await page.locator('.skill-node').filter({ hasText: 'Army logistics' }).click();
  await page.locator('.skill-detail').getByRole('button', { name: 'Learn · 2 SP' }).click();
  await page.locator('.skill-node.purchased').filter({ hasText: 'Army logistics' }).waitFor();
  assert.match(await page.locator('.skill-intro').innerText(), /0 SP/);
  await screenshot('skills');
  await page.keyboard.press('Escape');
  pass('branching skills purchase with prerequisite and point accounting');

  await page.locator('.era-tab').nth(7).click();
  assert.match(await page.locator('h1').innerText(), /Beyond the Blue/);
  assert.equal(await page.locator('.mission-card').count(), 5);
  await page.locator('.era-tab').nth(0).click();
  pass('all eras and their five mission identities can be inspected');

  await page.getByTestId('start-battle').click();
  await page.locator('#battle-viewport[data-renderer="ready"]').waitFor();
  if (await page.getByRole('button', { name: 'Skip', exact: true }).count()) await page.getByRole('button', { name: 'Skip', exact: true }).click();
  if (!/Resume/.test(await page.getByTestId('pause').innerText())) await page.getByTestId('pause').click();
  await waitFor(async () => /Resume/.test(await page.getByTestId('pause').innerText()), 'pause did not activate');
  const pausedTime = await page.locator('[data-stat="time"] strong').innerText();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('[data-stat="time"] strong').innerText(), pausedTime);
  assert.equal(await page.locator('[data-stat="army"] strong').innerText(), '4 / 20');
  pass('real WebGL battle starts and tactical pause freezes simulation; skill capacity applies');

  await page.keyboard.press('h');
  await page.getByTestId('recruit-e1-frontline').click();
  await waitFor(async () => (await page.locator('[data-stat="supplies"] strong').innerText()) === '432', 'recruitment did not charge the unit cost');
  const queued = await page.locator('.training-jobs').innerText();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('.training-jobs').innerText(), queued);
  await screenshot('production');
  await page.getByTestId('pause').click();
  await waitFor(async () => (await page.locator('[data-stat="army"] strong').innerText()) === '5 / 20', 'trained soldier was not deployed', 12000);
  await page.getByTestId('pause').click();
  pass('recruitment consumes finite supplies, freezes while paused, then trains and deploys');

  const viewport = await page.locator('#battle-viewport').boundingBox();
  assert.ok(viewport);
  await page.mouse.move(viewport.x + 10, viewport.y + 10);
  await page.mouse.down();
  await page.mouse.move(viewport.x + viewport.width - 10, viewport.y + viewport.height - 10, { steps: 12 });
  await page.mouse.up();
  await page.getByRole('button', { name: '+ Add waypoint', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Spread', exact: true }).click();
  await page.keyboard.press('Control+1');
  await page.getByRole('button', { name: '+ Add waypoint', exact: true }).click();
  await page.getByLabel('ORDER', { exact: true }).selectOption('capture');
  await page.getByLabel('MAP X', { exact: true }).fill('8');
  await page.getByLabel('MAP Y', { exact: true }).fill('16');
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click();
  await page.locator('.order-list li').first().waitFor();
  await page.getByRole('button', { name: '+ Add waypoint', exact: true }).click();
  await page.getByLabel('MAP X', { exact: true }).fill('11');
  await page.getByLabel('MAP Y', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Add to plan', exact: true }).click();
  await waitFor(async () => await page.locator('.order-list li').count() === 2, 'append queue failed');
  await page.locator('button[title="Move order earlier"]').nth(1).click();
  await page.locator('button[title="Move order later"]').nth(0).click();
  await page.locator('button[title="Cancel order"]').nth(1).click();
  await waitFor(async () => await page.locator('.order-list li').count() === 1, 'cancel queued order failed');
  await page.keyboard.press('Escape');
  await page.keyboard.press('1');
  await page.getByRole('button', { name: '+ Add waypoint', exact: true }).waitFor();
  pass('drag selection, control groups, advanced formation and editable ordered plans work during pause');
  await screenshot('planning');

  const mini = await page.getByTestId('minimap').boundingBox(); assert.ok(mini);
  await page.mouse.click(mini.x + mini.width * 8 / 28, mini.y + mini.height * 16 / 24, { button: 'right' });
  await page.getByTestId('pause').click();
  await waitFor(async () => Number((await page.locator('[data-stat="score"] strong').innerText()).replaceAll(',', '')) >= 500, 'army did not capture River stones', 25000);
  await page.getByTestId('pause').click();
  await menuSave();
  const captured = await currentSave();
  assert.ok(captured.battle.factions[0].captured.includes('e1m1-site-1'));
  assert.equal(captured.battle.paused, true);
  pass('minimap issues real orders and the selected army gradually captures an outpost');
  await screenshot('captured-outpost');

  await page.locator('button[title="Battle menu"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export complete save', exact: true }).click();
  const download = await downloadPromise;
  const exported = new URL('browser-export.json', output).pathname;
  await download.saveAs(exported);
  const portable = JSON.parse(await readFile(exported, 'utf8'));
  assert.equal(portable.version, 1); assert.ok(portable.battle.units.length);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('resume-battle').click();
  await page.locator('#battle-viewport[data-renderer="ready"]').waitFor();
  await waitFor(async () => await page.getByTestId('pause').getAttribute('aria-pressed') === 'true', 'restored battle was not paused');
  pass('complete portable export and browser reload restore the active battle');

  await page.locator('button[title="Battle menu"]').click();
  await page.getByRole('button', { name: 'Return to campaign', exact: true }).click();
  await page.getByRole('button', { name: 'Save & return to campaign', exact: true }).click();
  await page.getByTestId('download-offline').click();
  await waitFor(async () => /All eras available offline/.test(await page.getByTestId('download-offline').innerText()), 'offline download did not complete', 20000);
  const eraCount = await page.evaluate(async () => {
    const keys = await caches.keys(); const cache = await caches.open(keys.find(k => k.startsWith('eightfold-')));
    return (await cache.keys()).filter(r => /\/art\/era-\d+\.svg/.test(r.url)).length;
  }); assert.equal(eraCount, 8);
  const covers = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys()).find(k => k.startsWith('eightfold-')));
    return (await cache.keys()).filter(r => /\/art\/era-cover-\d+\.webp/.test(r.url)).length;
  }); assert.equal(covers, 8);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('language-settings').click();
  await page.getByTestId('language-ar').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
  await page.evaluate(() => document.fonts.ready);
  assert.ok(await page.evaluate(() => document.fonts.check('400 16px "Plex Arabic"') && document.fonts.check('600 16px "Plex Arabic"')), 'Arabic fonts were unavailable offline');
  await page.locator('.era-tab').nth(7).click();
  await page.locator('.feature-art img').evaluate(image => image.decode());
  await page.getByTestId('resume-battle').click();
  await page.locator('#battle-viewport[data-renderer="ready"]').waitFor();
  await screenshot('offline-battle');
  pass('all eight eras and Arabic fonts cache successfully; a fresh offline reload restores the Arabic game and Worker');
  await page.getByTestId('battle-settings').click();
  await page.getByTestId('language-en').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('html').getAttribute('dir'),'ltr');
  await context.setOffline(false);
  await page.locator('button[title="Battle menu"]').click();
  await page.getByRole('button', { name: 'Return to campaign', exact: true }).click();
  await page.getByRole('button', { name: 'Save & return to campaign', exact: true }).click();

  const fixture = new URL('late-victory.json', output).pathname;
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await waitFor(async () => /01:11/.test(await page.getByTestId('resume-battle').innerText()), 'late battle import did not finish');
  await page.getByTestId('resume-battle').click();
  await page.getByRole('heading', { name: 'Ground gained.', exact: true }).waitFor({ timeout: 15000 });
  assert.ok(await page.locator('.results-page').evaluate(async element => {
    const source = getComputedStyle(element, '::before').backgroundImage.match(/url\("([^\"]+)"\)/)?.[1];
    if (!source) return false;
    const image = new Image(); image.src = source; await image.decode();
    return image.naturalWidth === 768 && image.naturalHeight === 256;
  }), 'the era-specific result background must decode as the real image');
  await screenshot('victory');
  const finished = await currentSave();
  assert.equal(finished.campaign.records.e1m1.victory, true);
  assert.ok(finished.campaign.records.e1m1.claimed.length > 0);
  const points = finished.campaign.points;
  pass('validated real-simulation near-result fixture finishes in Worker and awards campaign progression');
  await page.getByRole('button', { name: 'Campaign', exact: true }).click();
  assert.equal(await page.locator('.mission-card.completed').count(), 1);
  assert.equal(await page.locator('.mission-card.locked').count(), 3);
  await page.getByRole('button', { name: 'Export save', exact: true }).click();
  assert.equal((await currentSave()).campaign.points, points);
  pass('victory unlocks the next mission, preserves replay and does not duplicate rewards');
  assert.deepEqual(errors, []);
  const report = { browser: await browser.version(), viewport: [1440, 1000], checks, pageErrors: errors, timestamp: new Date().toISOString() };
  await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await screenshot('browser-failure').catch(() => undefined);
  console.error('BROWSER FAILURE', error);
  console.error((await page.locator('body').innerText({ timeout: 5000 }).catch(() => 'Page unavailable.')).slice(-6000));
  process.exitCode = 1;
} finally { await browser.close(); }
