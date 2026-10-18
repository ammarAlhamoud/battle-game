import type { BattleState, GameContent, MissionDef, Side, StrongholdConfig, Vec } from '../contracts.js';
import { unitVisible } from '../sim/engine.js';
import { icon, type IconName } from './icons.js';

/** Display-only copy. Merge this into the main dictionary, or use the module's fallback. */
export const BATTLE_INTEL_AR: Readonly<Record<string, string>> = {
  'Field intelligence': 'معلومات الميدان', 'Objective': 'الهدف',
  'Capture the enemy stronghold': 'استولِ على حصن العدو',
  'Show enemy stronghold': 'عرض حصن العدو',
  'Outposts fund reinforcements': 'المواقع الأمامية تموّل التعزيزات',
  'Sites held': 'المواقع الخاضعة لك',
  'First capture only · No passive income': 'مكافأة أول استيلاء فقط · لا دخل تلقائي',
  'Known positions': 'المواقع المعروفة', 'Scout to discover strategic sites': 'استطلع لاكتشاف المواقع الاستراتيجية',
  'Yours': 'تحت سيطرتك', 'Enemy': 'للعدو', 'Neutral': 'محايد', 'Unconfirmed': 'غير مؤكّد',
  'Last seen': 'آخر مشاهدة', 'Capturing': 'جارٍ الاستيلاء', 'Contested': 'جارٍ انتزاع السيطرة',
  'first capture': 'أول استيلاء', 'Reward already claimed': 'سبق استلام المكافأة',
  'supplies': 'إمدادات', 'Focus this position': 'عرض هذا الموقع',
  'Your main stronghold is being captured': 'يجري الاستيلاء على حصنك الرئيسي',
  'Visible enemies near your main stronghold': 'أعداء مرئيون قرب حصنك الرئيسي',
  'No visible threats near your main stronghold': 'لا تهديدات مرئية قرب حصنك الرئيسي',
  'Defend your main stronghold': 'دافع عن حصنك الرئيسي',
  'Recent field reports': 'تقارير الميدان الأخيرة', 'Waiting for field reports': 'بانتظار تقارير الميدان',
  'Captured': 'تم الاستيلاء', 'Reinforcements deployed': 'وصلت التعزيزات',
  'Soldier lost': 'فُقد جندي', 'Position under attack': 'موقع يتعرض للهجوم',
  'Enemy position contested': 'موقع العدو قيد النزاع',
  'Show field details': 'عرض تفاصيل الميدان', 'Hide field details': 'إخفاء تفاصيل الميدان',
  'Details': 'التفاصيل', 'Hide': 'إخفاء',
  'Main stronghold': 'الحصن الرئيسي',
};

type KnownOwner = Side | null | 'unknown';
export interface IntelSiteMemory { owner: KnownOwner; capturing: Side | null; progress: number; observedAt: number }
export interface IntelSite extends Omit<StrongholdConfig, 'owner'>, IntelSiteMemory { visible: boolean; observed: boolean; rewardAvailable: boolean }
export interface IntelReport extends Vec {
  id: number; time: number; owner: Side; kind: 'capture' | 'deploy' | 'death' | 'alert'; subject: string; reward: number;
}
export interface IntelMemory {
  sites: Record<string, IntelSiteMemory>; maxEvent: number; feed: IntelReport[]; claimed: string[]; initialized: boolean;
}
export interface IntelObservation {
  sites: IntelSite[]; outpostsHeld: number; outpostsTotal: number;
  alert: { kind: 'capture' | 'nearby'; point: Vec; enemies: number; progress: number } | null;
  feed: IntelReport[]; memory: IntelMemory;
}
const squaredDistance = (a: Vec, b: Vec) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
function visibleAt(mission: MissionDef, state: BattleState, point: Vec): boolean {
  const x = Math.round(point.x), y = Math.round(point.y), width = mission.map[0]!.length;
  return x >= 0 && y >= 0 && x < width && y < mission.map.length && !!state.fog[0].visible[y * width + x];
}
function exploredAt(mission: MissionDef, state: BattleState, point: Vec): boolean {
  const x = Math.round(point.x), y = Math.round(point.y), width = mission.map[0]!.length;
  return x >= 0 && y >= 0 && x < width && y < mission.map.length && !!state.fog[0].explored[y * width + x];
}

/** Pure observer. A hidden stronghold can only reuse a previous legal observation. */
export function observeBattleIntel(content: GameContent, mission: MissionDef, state: BattleState, previous?: IntelMemory): IntelObservation {
  const memory: IntelMemory = {
    sites: Object.fromEntries(Object.entries(previous?.sites ?? {}).map(([id, item]) => [id, { ...item }])),
    maxEvent: previous?.maxEvent ?? 0, feed: [...(previous?.feed ?? [])],
    claimed: [...state.factions[0].captured], initialized: true,
  };
  const sites: IntelSite[] = [];
  const outposts = mission.strongholds.filter(site => site.kind !== 'main');
  const ownMain = mission.strongholds.find(site => site.kind === 'main' && site.owner === 0);
  for (const configured of [...(ownMain ? [ownMain] : []), ...outposts]) {
    const current = state.strongholds.find(site => site.id === configured.id);
    const visible = visibleAt(mission, state, configured) || current?.owner === 0;
    // Own strongholds are an allowed source of live knowledge and vision.
    if (current && (visible || current.owner === 0)) memory.sites[configured.id] = {
      owner: current.owner, capturing: current.capturing, progress: Math.max(0, Math.min(100, current.progress)), observedAt: state.time,
    };
    const known = memory.sites[configured.id];
    if (!known && !exploredAt(mission, state, configured) && configured.id !== ownMain?.id) continue;
    sites.push({ ...configured, ...(known ?? { owner: 'unknown', capturing: null, progress: 0, observedAt: 0 }),
      visible, observed: !!known, rewardAvailable: !state.factions[0].captured.includes(configured.id) });
  }
  let alert: IntelObservation['alert'] = null;
  if (ownMain) {
    const current = state.strongholds.find(site => site.id === ownMain.id);
    const legal = !!current && (current.owner === 0 || visibleAt(mission, state, current));
    const enemies = state.units.filter(unit => unit.owner === 1 && unit.hp > 0 && squaredDistance(unit, ownMain) <= 64 && unitVisible(state, unit, 0, content)).length;
    if (legal && current!.capturing === 1 && current!.progress > 0) alert = { kind: 'capture', point: { x: ownMain.x, y: ownMain.y }, enemies, progress: current!.progress };
    else if (enemies > 0) alert = { kind: 'nearby', point: { x: ownMain.x, y: ownMain.y }, enemies, progress: 0 };
  }
  const newEvents = state.events.filter(event => event.id > memory.maxEvent).sort((a, b) => a.id - b.id);
  const reportedClaims = new Set(previous?.claimed ?? state.factions[0].captured);
  for (const event of newEvents) {
    const isFriendlyReport = event.owner === 0 && ['capture', 'deploy', 'death'].includes(event.kind);
    // A restored history cannot prove that a hidden enemy alert was legal when it occurred.
    const isVisibleAlert = event.kind === 'alert' && visibleAt(mission, state, event) &&
      (event.owner === 0 || !!previous?.initialized && event.tick === state.tick);
    if (!isFriendlyReport && !isVisibleAlert) continue;
    if (!previous?.initialized && state.tick - event.tick > 100) continue;
    const site = mission.strongholds.find(item => squaredDistance(item, event) < .3);
    const subject = event.kind === 'alert' ? site?.name ?? '' : event.text ?? site?.name ?? '';
    const firstCapture = event.kind === 'capture' && !!site && !!previous?.initialized && !reportedClaims.has(site.id);
    if (event.kind === 'capture' && site) reportedClaims.add(site.id);
    memory.feed.unshift({ id: event.id, time: Math.max(0, state.time - Math.max(0, state.tick - event.tick) * .1),
      owner: event.owner, kind: event.kind as IntelReport['kind'], subject, x: event.x, y: event.y, reward: firstCapture ? site.reward : 0 });
  }
  memory.maxEvent = Math.max(memory.maxEvent, ...state.events.map(event => event.id), 0);
  memory.feed = memory.feed.slice(0, 3);
  return { sites, outpostsHeld: state.strongholds.filter(site => outposts.some(configured => configured.id === site.id) && site.owner === 0).length,
    outpostsTotal: outposts.length, alert, feed: memory.feed, memory };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ''): HTMLElementTagNameMap[K] {
  const item = document.createElement(tag); item.className = className; return item;
}
function setText(item: HTMLElement, text: string): void { if (item.textContent !== text) item.textContent = text; }
function clock(time: number): string { return `${Math.floor(time / 60).toString().padStart(2, '0')}:${Math.floor(time % 60).toString().padStart(2, '0')}`; }
interface SiteRow { button: HTMLButtonElement; name: HTMLElement; status: HTMLElement; reward: HTMLElement; progress: HTMLProgressElement; percent: HTMLElement }
interface FeedRow { button: HTMLButtonElement; title: HTMLElement; detail: HTMLElement; time: HTMLElement; reward: HTMLElement }
export interface BattleIntel {
  element: HTMLElement; update(state: BattleState): void; relocalize(): void; destroy(): void;
}

/** Presentation consumes an observation; it never issues commands or mutates battle state. */
export function createBattleIntel(content: GameContent, mission: MissionDef, translate: (source: string) => string, onFocus: (point: Vec) => void): BattleIntel {
  const element = el('aside', 'battle-intel'); element.dataset.testid = 'battle-intel';
  let memory: IntelMemory | undefined;
  let observation: IntelObservation | null = null;
  let destroyed = false;
  let expanded = false;
  let announcedAlert = '';
  const abort = new AbortController();
  const siteRows = new Map<string, SiteRow>(); const feedRows = new Map<number, FeedRow>();
  const enemyMain = mission.strongholds.find(site => site.kind === 'main' && site.owner === 1);
  const t = (source: string) => {
    const output = translate(source);
    return output === source && document.documentElement.lang === 'ar' ? BATTLE_INTEL_AR[source] ?? output : output;
  };
  const header = el('div', 'battle-intel-heading');
  const objective = el('button', 'battle-intel-objective'); objective.type = 'button';
  const objectiveCopy = el('span', 'battle-intel-objective-copy'); const objectiveKicker = el('small'); const objectiveTitle = el('strong');
  objectiveCopy.append(objectiveKicker, objectiveTitle); objective.append(icon('target'), objectiveCopy);
  objective.onclick = () => { if (enemyMain) onFocus({ x: enemyMain.x, y: enemyMain.y }); };
  const toggle = el('button', 'battle-intel-toggle'); toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false');
  const toggleText = el('span'); toggle.append(toggleText, icon('menu'));
  toggle.onclick = () => { expanded = !expanded; element.classList.toggle('is-expanded', expanded); toggle.setAttribute('aria-expanded', String(expanded)); relocalize(); };
  header.append(objective, toggle);
  const economy = el('div', 'battle-intel-economy'); const economyTitle = el('span'); const ownedCount = el('strong');
  economy.append(icon('supplies'), economyTitle, ownedCount);
  const alertButton = el('button', 'battle-intel-alert'); alertButton.type = 'button'; alertButton.hidden = true;
  const alertTitle = el('span'); const alertValue = el('strong'); alertButton.append(icon('defend'), alertTitle, alertValue);
  alertButton.onclick = () => { if (observation?.alert) onFocus(observation.alert.point); };
  const details = el('div', 'battle-intel-details');
  const economyHint = el('p', 'battle-intel-economy-hint');
  const siteSection = el('section', 'battle-intel-site-section'); const siteHeading = el('h3'); const siteList = el('div', 'battle-intel-sites');
  const siteEmpty = el('p', 'battle-intel-empty'); siteSection.append(siteHeading, siteList, siteEmpty);
  const feedSection = el('section', 'battle-intel-feed-section'); const feedHeading = el('h3'); const feedList = el('div', 'battle-intel-feed');
  const feedEmpty = el('p', 'battle-intel-empty'); feedSection.append(feedHeading, feedList, feedEmpty);
  details.append(economyHint, siteSection, feedSection);
  const live = el('div', 'battle-intel-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
  element.append(header, economy, alertButton, details, live);
  for (const event of ['pointerdown', 'pointerup', 'click', 'dblclick', 'contextmenu', 'wheel'] as const) element.addEventListener(event, event => event.stopPropagation(), { signal: abort.signal });
  element.addEventListener('keydown', event => { if ([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) event.stopPropagation(); }, { signal: abort.signal });

  function makeSite(site: IntelSite): SiteRow {
    const button = el('button', 'battle-intel-site'); button.type = 'button'; button.dataset.site = site.id;
    const marker = icon(site.kind === 'main' ? 'home' : site.kind === 'watchtower' ? 'tower' : site.kind === 'gate' ? 'barrier' : 'flag');
    const copy = el('span', 'battle-intel-site-copy'); const name = el('strong'); const status = el('small');
    const reward = el('small', 'battle-intel-site-reward'); const progress = el('progress'); progress.max = 100;
    const percent = el('span', 'battle-intel-site-percent');
    copy.append(name, status, reward); button.append(marker, copy, percent, progress);
    button.onclick = () => onFocus({ x: site.x, y: site.y }); siteList.append(button);
    return { button, name, status, reward, progress, percent };
  }
  function renderSites(): void {
    if (!observation) return;
    setText(ownedCount, `${observation.outpostsHeld} / ${observation.outpostsTotal}`);
    ownedCount.setAttribute('aria-label', `${t('Sites held')}: ${observation.outpostsHeld} / ${observation.outpostsTotal}`);
    siteEmpty.hidden = observation.sites.length > 0;
    for (const site of observation.sites) {
      let row = siteRows.get(site.id); if (!row) { row = makeSite(site); siteRows.set(site.id, row); }
      const owner = site.owner === 0 ? 'Yours' : site.owner === 1 ? 'Enemy' : site.owner === null ? 'Neutral' : 'Unconfirmed';
      const activeCapture = site.visible && site.capturing !== null && site.progress > 0;
      const status = !site.visible && site.observed ? `${t('Last seen')} · ${t(owner)}` : t(owner);
      setText(row.name, t(site.name)); setText(row.status, activeCapture ? `${status} · ${t(site.capturing === 0 ? 'Capturing' : 'Contested')}` : status);
      setText(row.reward, site.kind === 'main' ? t('Main stronghold') : site.rewardAvailable && site.reward > 0 ? `+${site.reward} ${t('supplies')} · ${t('first capture')}` : t('Reward already claimed'));
      row.button.dataset.owner = String(site.owner); row.button.classList.toggle('is-memory', !site.visible);
      row.button.title = `${t('Focus this position')}: ${t(site.name)}`;
      row.progress.hidden = !activeCapture; row.percent.hidden = !activeCapture;
      if (activeCapture) { row.progress.value = site.progress; row.progress.setAttribute('aria-label', `${t(site.name)} · ${t('Capturing')}`); setText(row.percent, `${Math.floor(site.progress)}%`); }
    }
  }
  function renderFeed(): void {
    if (!observation) return;
    const active = new Set(observation.feed.map(item => item.id));
    for (const [id, row] of feedRows) if (!active.has(id)) { row.button.remove(); feedRows.delete(id); }
    for (let index = observation.feed.length - 1; index >= 0; index--) {
      const report = observation.feed[index]!; let row = feedRows.get(report.id);
      if (!row) {
        const button = el('button', 'battle-intel-report'); button.type = 'button'; button.dataset.kind = report.kind;
        const iconNames: Record<IntelReport['kind'], IconName> = { capture: 'capture', deploy: 'army', death: 'guard', alert: 'target' };
        const copy = el('span', 'battle-intel-report-copy'); const title = el('strong'); const detail = el('small'); const time = el('time'); const reward = el('small', 'battle-intel-report-reward');
        copy.append(title, detail); button.append(icon(iconNames[report.kind]), copy, time, reward);
        button.onclick = () => onFocus({ x: report.x, y: report.y }); row = { button, title, detail, time, reward }; feedRows.set(report.id, row);
      }
      const keys = { capture: 'Captured', deploy: 'Reinforcements deployed', death: 'Soldier lost', alert: 'Position under attack' };
      setText(row.title, t(report.kind === 'alert' && report.owner === 1 ? 'Enemy position contested' : keys[report.kind])); setText(row.detail, t(report.subject)); row.detail.hidden = !report.subject;
      setText(row.time, clock(report.time)); row.reward.hidden = report.reward <= 0;
      if (report.reward > 0) setText(row.reward, `+${report.reward} ${t('supplies')}`);
      // Existing report nodes retain focus and identity while new reports are prepended.
      if (row.button.parentNode !== feedList) feedList.prepend(row.button);
    }
    feedEmpty.hidden = observation.feed.length > 0;
  }
  function renderAlert(announce = true): void {
    const alert = observation?.alert;
    alertButton.hidden = !alert;
    if (!alert) { if (announcedAlert && announce) setText(live, t('No visible threats near your main stronghold')); announcedAlert = ''; return; }
    const key = alert.kind === 'capture' ? 'Your main stronghold is being captured' : 'Visible enemies near your main stronghold';
    setText(alertTitle, t(key)); setText(alertValue, alert.kind === 'capture' ? `${Math.floor(alert.progress)}%` : `${alert.enemies}`);
    alertButton.dataset.level = alert.kind; alertButton.title = t('Defend your main stronghold');
    if (announce && announcedAlert !== alert.kind) setText(live, t(key));
    announcedAlert = alert.kind;
  }
  function relocalize(): void {
    if (destroyed) return;
    element.dir = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
    element.setAttribute('aria-label', t('Field intelligence'));
    setText(objectiveKicker, t('Objective')); setText(objectiveTitle, t('Capture the enemy stronghold')); objective.title = t('Show enemy stronghold');
    setText(toggleText, t(expanded ? 'Hide' : 'Details')); toggle.setAttribute('aria-label', t(expanded ? 'Hide field details' : 'Show field details'));
    setText(economyTitle, t('Outposts fund reinforcements')); setText(economyHint, t('First capture only · No passive income'));
    setText(siteHeading, t('Known positions')); setText(siteEmpty, t('Scout to discover strategic sites'));
    setText(feedHeading, t('Recent field reports')); setText(feedEmpty, t('Waiting for field reports'));
    renderSites(); renderFeed(); renderAlert(false);
    if (observation?.alert) setText(live, t(observation.alert.kind === 'capture' ? 'Your main stronghold is being captured' : 'Visible enemies near your main stronghold'));
  }
  relocalize();
  return { element,
    update(state) { if (destroyed) return; observation = observeBattleIntel(content, mission, state, memory); memory = observation.memory; renderSites(); renderFeed(); renderAlert(); },
    relocalize,
    destroy() { destroyed = true; abort.abort(); element.remove(); element.replaceChildren(); memory = undefined; observation = null; siteRows.clear(); feedRows.clear(); },
  };
}
