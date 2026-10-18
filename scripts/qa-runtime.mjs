import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Uses the real main module with a small test UI and controlled Worker transport.
// No renderer, saves, or fault injection are exposed to the production application.
const base = (process.env.GAME_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const output = new URL('../.cache/qa-runtime/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const checks = [], errors = [];
const uiModule = `export function mountUI(options){
  window.__qaOptions=options;
  const view=window.__qaView={screen:'campaign',begins:0,resultCount:0,notifications:[],campaign:structuredClone(options.campaign),savedBattle:structuredClone(options.savedBattle),state:null};
  return {beginBattle(id){view.screen='battle';view.mission=id;view.begins++;},setState(s){view.state=structuredClone(s);},setCampaign(c,b){view.campaign=structuredClone(c);if(b!==undefined)view.savedBattle=structuredClone(b);},showResults(r){view.screen='results';view.resultCount++;view.results=r;},showCampaign(){view.screen='campaign';},notify(message){view.notifications.push(message);},destroy(){}};
}`;

async function setup({ nativeWorker = false, failWorkerLoad = false } = {}) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('**/src/ui/index.ts*', route => route.fulfill({ contentType: 'application/javascript', body: uiModule }));
  if (failWorkerLoad) await context.route('**/src/worker.ts*', route => route.abort('failed'));
  await context.addInitScript(({ nativeWorker }) => {
    window.__qaWorkers = [];
    window.__qaNativeWorker = window.Worker;
    if (!nativeWorker) window.Worker = class ControlledWorker {
      constructor(url) {
        if (window.__qaThrowConstructor) throw new Error('Injected worker constructor failure');
        this.url = String(url); this.messages = []; this.terminated = 0; this.state = null;
        window.__qaWorkers.push(this);
      }
      postMessage(message) {
        this.messages.push(structuredClone(message));
        this.savedMessageHandler ||= this.onmessage; this.savedErrorHandler ||= this.onerror;
      }
      emit(message) {
        if (message.type === 'state') this.state = structuredClone(message.state);
        this.onmessage?.({ data: structuredClone(message) });
      }
      reply(state = this.state) {
        const request = this.messages.filter(m => m.type === 'snapshot').at(-1);
        if (!request) throw new Error('No explicit snapshot request');
        this.emit({ type: 'state', state, requestId: request.requestId });
      }
      terminate() { this.terminated++; }
      fail(message) { this.onerror?.({ message, preventDefault() {} }); }
    };
    const nativeOpen = indexedDB.open.bind(indexedDB);
    window.__qaDelayedOpens = [];
    const activate = (proxy, args) => {
      const real = nativeOpen(...args);
      for (const name of ['success', 'error', 'blocked', 'upgradeneeded']) real['on' + name] = event => {
        if (name === 'success' || name === 'upgradeneeded') proxy.result = real.result;
        if (name === 'error') proxy.error = real.error;
        proxy['on' + name]?.(event);
      };
    };
    window.__qaReleaseDB = () => {
      window.__qaHoldDB = false;
      for (const { proxy, args } of window.__qaDelayedOpens.splice(0)) activate(proxy, args);
    };
    indexedDB.open = (...args) => {
      if (window.__qaFailDB) {
        const proxy = { error: new DOMException('Injected save failure', 'QuotaExceededError') };
        queueMicrotask(() => proxy.onerror?.({ target: proxy })); return proxy;
      }
      if (window.__qaHoldDB) { const proxy = {}; window.__qaDelayedOpens.push({ proxy, args }); return proxy; }
      return nativeOpen(...args);
    };
  }, { nativeWorker });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.setDefaultTimeout(10_000);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__qaOptions));
  await page.evaluate(async () => {
    window.__qaContent = (await import('/src/content/index.ts')).content;
    window.__qaEngine = await import('/src/sim/engine.ts');
    window.__qaPersistence = await import('/src/persistence/index.ts');
    window.__qaState = window.__qaEngine.createBattle(window.__qaContent.missions[0], window.__qaContent, [], []);
    window.__qaState.paused = true;
  });
  return { context, page };
}
function pass(name) { checks.push(name); console.log('PASS ' + name); }
async function scenario(name, test, options) {
  const { context, page } = await setup(options);
  try { await test(page); pass(name); } finally { await context.close(); }
}

try {
  await scenario('double starts are ignored; saves require matching worker replies; leaving cannot close a later session', async page => {
    await page.evaluate(() => {
      const o = window.__qaOptions;
      o.onStart('e1m1', false); o.onStart('e1m1', false);
      const w = window.__qaWorkers[0]; w.emit({ type: 'state', state: window.__qaState });
      o.onStart('e1m1', false);
      window.__qaSaveDone = false;
      o.onSave().then(() => { window.__qaSaveDone = true; }, e => { window.__qaSaveError = String(e); });
      w.emit({ type: 'state', state: window.__qaState });
    });
    assert.equal(await page.evaluate(() => window.__qaWorkers.length), 1);
    assert.equal(await page.evaluate(() => window.__qaWorkers[0].messages[0].startPaused), true);
    assert.equal(await page.evaluate(() => window.__qaSaveDone), false);
    await page.evaluate(() => {
      const s = structuredClone(window.__qaState);
      window.__qaEngine.applyCommand(s, { type: 'recruit', side: 0, unitId: window.__qaContent.eras[0].units[0].id }, window.__qaContent);
      window.__qaWorkers[0].reply(s);
    });
    await page.waitForFunction(() => window.__qaSaveDone);
    const saved = await page.evaluate(async () => window.__qaPersistence.loadGame());
    assert.equal(saved.battle.factions[0].lines[0].queue.length, 1);
    await page.evaluate(() => {
      window.__qaOptions.onLeave(); window.__qaOptions.onLeave(); window.__qaOptions.onStart('e1m1', false);
    });
    assert.equal(await page.evaluate(() => window.__qaWorkers.length), 1);
    assert.equal(await page.evaluate(() => window.__qaWorkers[0].messages.filter(m => m.type === 'snapshot').length), 2);
    await page.evaluate(() => window.__qaWorkers[0].reply());
    await page.waitForFunction(() => window.__qaView.screen === 'campaign');
    await page.evaluate(() => {
      const old = window.__qaWorkers[0]; window.__qaOptions.onStart('e1m1', false);
      window.__qaWorkers[1].emit({ type: 'state', state: window.__qaState });
      old.savedMessageHandler({ data: { type: 'state', state: { ...window.__qaState, ended: true, winner: 1 } } });
      old.savedErrorHandler({ message: 'late worker error', preventDefault() {} });
    });
    assert.equal(await page.evaluate(() => window.__qaView.screen), 'battle');
    assert.equal(await page.evaluate(() => window.__qaWorkers[1].terminated), 0);
    assert.equal(await page.evaluate(() => window.__qaWorkers[0].terminated), 1);
  });

  await scenario('fatal worker errors return to campaign with the last valid paused snapshot and allow resume', async page => {
    await page.evaluate(() => {
      window.__qaOptions.onStart('e1m1', false);
      const s = structuredClone(window.__qaState); s.paused = false;
      for (let i = 0; i < 3; i++) window.__qaEngine.stepBattle(s, window.__qaContent);
      window.__qaWorkers[0].emit({ type: 'state', state: s });
      window.__qaWorkers[0].fail('Injected simulation crash');
    });
    await page.waitForFunction(() => window.__qaView.screen === 'campaign');
    assert.equal(await page.evaluate(() => window.__qaView.savedBattle.paused), true);
    assert.equal(await page.evaluate(() => window.__qaView.savedBattle.tick), 3);
    assert.match(await page.evaluate(() => window.__qaView.notifications.join('\n')), /Simulation stopped: Injected simulation crash/);
    await page.evaluate(() => window.__qaOptions.onSave());
    const saved = await page.evaluate(() => window.__qaPersistence.loadGame());
    assert.equal(saved.battle.paused, true); assert.equal(saved.battle.tick, 3);
    await page.evaluate(() => window.__qaOptions.onStart('e1m1', true));
    assert.equal(await page.evaluate(() => window.__qaWorkers[1].messages[0].restored.tick), 3);
    assert.equal(await page.evaluate(() => window.__qaWorkers[1].messages[0].restored.paused), true);
    assert.equal(await page.evaluate(() => window.__qaWorkers[0].terminated), 1);
  });

  await scenario('worker constructor failures recover rather than leaving an inert battlefield', async page => {
    await page.evaluate(() => { window.__qaThrowConstructor = true; window.__qaOptions.onStart('e1m1', false); });
    assert.equal(await page.evaluate(() => window.__qaView.screen), 'campaign');
    assert.match(await page.evaluate(() => window.__qaView.notifications.join('\n')), /Injected worker constructor failure/);
    await page.evaluate(() => { window.__qaThrowConstructor = false; window.__qaOptions.onStart('e1m1', false); });
    assert.equal(await page.evaluate(() => window.__qaWorkers.length), 1);
  });

  await scenario('a delayed old result save cannot replace a newly started battle with its results screen', async page => {
    await page.evaluate(() => {
      window.__qaOptions.onStart('e1m1', false); window.__qaWorkers[0].emit({ type: 'state', state: window.__qaState });
      window.__qaFlushDone = false; window.__qaOptions.onSave().then(() => { window.__qaFlushDone = true; }); window.__qaWorkers[0].reply();
    });
    await page.waitForFunction(() => window.__qaFlushDone);
    await page.evaluate(() => {
      window.__qaHoldDB = true;
      const ended = structuredClone(window.__qaState); window.__qaEngine.applyCommand(ended, { type: 'surrender', side: 0 }, window.__qaContent);
      window.__qaWorkers[0].emit({ type: 'state', state: ended });
    });
    await page.waitForFunction(() => window.__qaDelayedOpens.length > 0);
    await page.evaluate(() => {
      window.__qaOptions.onStart('e1m1', false); window.__qaWorkers[1].emit({ type: 'state', state: window.__qaState }); window.__qaReleaseDB();
    });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__qaView.screen), 'battle');
    assert.equal(await page.evaluate(() => window.__qaView.resultCount), 0);
    assert.equal(await page.evaluate(() => window.__qaWorkers[1].terminated), 0);
  });

  await scenario('respec after a completed battle clears only its historical snapshot and saves a valid skill ledger', async page => {
    await page.evaluate(() => {
      const o = window.__qaOptions; if (o.onBuySkill('discipline')) throw new Error('skill purchase failed');
      o.onStart('e1m1', false);
      const ended = window.__qaEngine.createBattle(window.__qaContent.missions[0], window.__qaContent, ['discipline'], []);
      window.__qaEngine.applyCommand(ended, { type: 'surrender', side: 0 }, window.__qaContent);
      window.__qaWorkers[0].emit({ type: 'state', state: ended });
    });
    await page.waitForFunction(() => window.__qaView.screen === 'results');
    assert.equal(await page.evaluate(() => window.__qaOptions.onRespec()), null);
    await page.evaluate(() => window.__qaOptions.onSave());
    const saved = await page.evaluate(() => window.__qaPersistence.loadGame());
    assert.equal(saved.battle, null); assert.deepEqual(saved.campaign.skills, []);
    assert.equal(saved.campaign.points, saved.campaign.totalEarned);
    assert.ok(saved.campaign.records.e1m1);
  });

  await scenario('failed imports keep the live campaign intact and imports block racing starts until commit', async page => {
    await page.evaluate(async () => {
      if (window.__qaOptions.onBuySkill('discipline')) throw new Error('skill purchase failed');
      await window.__qaOptions.onSave();
      const imported = { version: 1, savedAt: 1000, campaign: window.__qaPersistence.createCampaign(), battle: null }; imported.campaign.selectedEra = 7;
      window.__qaImportFile = new File([JSON.stringify(imported)], 'import.json');
      window.__qaFailDB = true;
      try { await window.__qaOptions.onImport(window.__qaImportFile); throw new Error('import should fail'); }
      catch (error) { if (!String(error).includes('Injected save failure')) throw error; }
      finally { window.__qaFailDB = false; }
    });
    assert.equal(await page.evaluate(() => window.__qaView.campaign.selectedEra), 0);
    assert.equal(await page.evaluate(() => window.__qaOptions.onBuySkill('logistics')), null);
    await page.evaluate(async () => {
      await window.__qaOptions.onSave();
      const file = window.__qaImportFile;
      const text = await file.text(); Object.defineProperty(file, 'text', { value: () => new Promise(resolve => { window.__qaReleaseImport = () => resolve(text); }) });
      window.__qaImportDone = false; window.__qaOptions.onImport(file).then(() => { window.__qaImportDone = true; });
      window.__qaOptions.onStart('e1m1', false);
    });
    assert.equal(await page.evaluate(() => window.__qaWorkers.length), 0);
    await page.evaluate(() => window.__qaReleaseImport());
    await page.waitForFunction(() => window.__qaImportDone);
    assert.equal(await page.evaluate(() => window.__qaView.campaign.selectedEra), 7);
    assert.equal(await page.evaluate(() => window.__qaView.campaign.points), 3);
  });

  await scenario('real worker module-load failure recovers to the campaign with a visible error', async page => {
    await page.evaluate(() => window.__qaOptions.onStart('e1m1', false));
    await page.waitForFunction(() => window.__qaView.screen === 'campaign' && window.__qaView.notifications.some(m => m.startsWith('Simulation stopped:')));
    assert.equal(await page.evaluate(() => window.__qaView.savedBattle), null);
  }, { nativeWorker: true, failWorkerLoad: true });

  await scenario('real worker starts the first tutorial paused, echoes snapshot IDs, resumes and faithfully restores saved pause state', async page => {
    const result = await page.evaluate(async () => {
      const wait = (predicate, timeout = 5000) => new Promise((resolve, reject) => {
        const start = performance.now(); const check = () => { if (predicate()) resolve(); else if (performance.now() - start > timeout) reject(new Error('worker response timeout')); else setTimeout(check, 15); }; check();
      });
      const worker = new window.__qaNativeWorker(new URL('/src/worker.ts', location.origin), { type: 'module' });
      const messages = []; worker.onmessage = event => messages.push(event.data);
      worker.postMessage({ type: 'init', missionId: 'e1m1', skills: [], startPaused: true });
      await wait(() => messages.some(m => m.type === 'state'));
      const first = structuredClone(messages.find(m => m.type === 'state').state);
      await new Promise(resolve => setTimeout(resolve, 350));
      const still = structuredClone(messages.filter(m => m.type === 'state').at(-1).state);
      worker.postMessage({ type: 'snapshot', requestId: 77 }); await wait(() => messages.some(m => m.requestId === 77));
      worker.postMessage({ type: 'command', command: { type: 'pause', value: false } }); await wait(() => messages.some(m => m.type === 'state' && m.state.tick > 0)); worker.terminate();
      const restored = structuredClone(window.__qaState); restored.paused = false; restored.tick = 17; restored.time = 1.7;
      const restoredWorker = new window.__qaNativeWorker(new URL('/src/worker.ts', location.origin), { type: 'module' });
      let initial = null; restoredWorker.onmessage = event => { if (!initial && event.data.type === 'state') initial = event.data.state; };
      restoredWorker.postMessage({ type: 'init', missionId: 'e1m1', skills: [], restored, startPaused: true });
      await wait(() => initial !== null); restoredWorker.terminate();
      return { initialPaused: first.paused, initialTick: first.tick, heldTick: still.tick, heldTime: still.time, restoredTick: initial.tick, restoredTime: initial.time, restoredPaused: initial.paused };
    });
    assert.equal(result.initialPaused, true); assert.equal(result.initialTick, 0); assert.equal(result.heldTick, 0); assert.equal(result.heldTime, 0);
    assert.equal(result.restoredTick, 17); assert.equal(result.restoredTime, 1.7); assert.equal(result.restoredPaused, false);
  });

  assert.deepEqual(errors, []);
  const report = { generatedAt: new Date().toISOString(), browser: await browser.version(), base, checks, errors };
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await writeFile(new URL('report.json', output), JSON.stringify({ checks, errors, failure: error.stack || String(error) }, null, 2)); throw error;
} finally { await browser.close(); }
