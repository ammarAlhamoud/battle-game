import type { BattleRenderer, BattleState, Campaign, Command, Formation, MissionDef, Order, Selection, SkillDef, Unit, UnitDef, Vec } from '../contracts';
import type { GameUI, ResultsData, UIOptions } from '../ui-contract';
import { createRenderer } from '../render/index';
import { unitVisible, capacity, usage, unlockedUnits, RULES } from '../sim/engine';
import { translate, getLanguage, setLanguage, type Language } from '../i18n/index';
import { icon as svgIcon, type IconName } from './icons';
import './style.css';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const SHORT_ERAS = ['Origins', 'Bronze', 'Classical', 'Medieval', 'Gunpowder', 'Industrial', 'Modern', 'Space'];
const FORMATIONS: Formation[] = ['line', 'column', 'wedge', 'spread', 'shield'];
const TUTORIALS = [
  { name: 'Make your first move', text: 'Left-click a soldier, or drag a box around your army. Right-click the ground to move. Teal is yours; coral belongs to your opponent.', key: '01 / SELECT & MOVE' },
  { name: 'A moment to think', text: 'Press Space for tactical pause. You can still select, change formations and plan. Hold Shift while right-clicking to queue orders. Resume when you are ready.', key: '02 / TACTICAL PAUSE' },
  { name: 'An army with a purpose', text: 'Select your main stronghold to recruit. Each unit has a cost, training time and capacity requirement. Full armies send reinforcements to reserves.', key: '03 / RECRUIT & REINFORCE' },
  { name: 'Hold the ground', text: 'Right-click a stronghold to capture or defend it. Occupy its ring until control changes. Outposts give a first-capture reward and capacity while you hold them.', key: '04 / CAPTURE & CONTROL' },
  { name: 'Know your opponent', text: 'Scouts reveal the map and detect stealth. The dim land is memory, not live intelligence. Capture the enemy main stronghold to win.', key: '05 / SCOUT & CONQUER' },
];

const textSources = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();
function displayTranslation(source:string):string { const value=translate(source);return getLanguage()==='ar'?value.replace(/\d[\d,]*(?:\.\d+)?\s*\/\s*\d[\d,]*(?:\.\d+)?/g,match=>`\u2066${match}\u2069`):value; }
function localizedText(source: string): Text { const text = document.createTextNode(displayTranslation(source)); textSources.set(text, source); return text; }
function setText(el: Element, source: string): void {
  const target = el.querySelector(':scope > .button-label') ?? el;
  const first = target.firstChild;
  if (target.childNodes.length === 1 && first instanceof Text) { textSources.set(first, source); const value = displayTranslation(source); if (first.data !== value) first.data = value; }
  else target.replaceChildren(localizedText(source));
}
function localAttribute(el: Element, name: string, source: string): void { let values = attributeSources.get(el); if (!values) { values = new Map(); attributeSources.set(el, values); } values.set(name, source); el.setAttribute(name, translate(source)); }
function localizeTree(parent: Node): void {
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) { const text = node as Text; const source = textSources.get(text); if (source !== undefined) text.data = displayTranslation(source); }
  if (parent instanceof Element) for (const el of [parent, ...parent.querySelectorAll('*')]) { const values = attributeSources.get(el); if (values) for (const [name, source] of values) el.setAttribute(name, translate(source)); }
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag); el.className = className; if (text) el.append(localizedText(text)); return el;
}
function append(parent: HTMLElement, ...children: (Node | string | null)[]) { for (const child of children) if (child !== null) parent.append(typeof child === 'string' ? localizedText(child) : child); return parent; }
function button(text: string, onClick: () => void, className = '', title = '') {
  const el = element('button', className); el.append(element('span', 'button-label', text)); el.type = 'button'; el.onclick = onClick; if (title) { localAttribute(el, 'title', title); if (!text) localAttribute(el, 'aria-label', title); } return el;
}
function withIcon(button: HTMLButtonElement, name: IconName): HTMLButtonElement { button.prepend(svgIcon(name)); return button; }
function label(text: string, className = '') { return element('span', className, text); }
function number(value: number) { return Math.max(0, Math.floor(value)).toLocaleString('en'); }
function clock(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
function titleCase(text: string) { return text.charAt(0).toUpperCase() + text.slice(1); }
function mapPreview(mission: MissionDef): SVGSVGElement {
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); const width=mission.map[0]!.length,height=mission.map.length;
  svg.setAttribute('viewBox',`0 0 ${(width+height)*6+24} ${(width+height)*3+20}`);svg.classList.add('mission-map');svg.setAttribute('aria-hidden','true');
  const colors:Record<string,string>={'.':'#60766b',f:'#304f45','^':'#88916a','~':'#315d67','=':'#b09b70','#':'#263d41',g:'#ad996d',c:'#75867b'};
  const groups=new Map<string,string[]>();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const key=mission.map[y]![x]!,px=(height+x-y)*6+12,py=(x+y)*3+8;const color=colors[key]??colors['.']!;const paths=groups.get(color)??[];paths.push(`M${px} ${py}l6 3-6 3-6-3Z`);groups.set(color,paths);}
  for(const [color,paths] of groups){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths.join(''));p.setAttribute('fill',color);svg.append(p);}
  for(const s of mission.strongholds){const x=(height+s.x-s.y)*6+12,y=(s.x+s.y)*3+11;const marker=document.createElementNS(svg.namespaceURI,'path');marker.setAttribute('d',`M${x} ${y-6}l4 4-4 4-4-4Z`);marker.setAttribute('fill',s.owner===0?'#86e0bd':s.owner===1?'#edac95':'#f1d297');marker.setAttribute('stroke','#17282c');marker.setAttribute('stroke-width','1.5');svg.append(marker);}
  return svg;
}

/** DOM-only presentation. The worker remains the single source of battle state. */
export function mountUI(options: UIOptions): GameUI {
  const { parent, content } = options;
  setLanguage(options.campaign.language ?? 'en');
  let campaign = options.campaign;
  let savedBattle = options.savedBattle;
  let state: BattleState | null = null;
  let mission: MissionDef | null = null;
  let renderer: BattleRenderer | null = null;
  let selection: Selection = { units: [], stronghold: null };
  let screen: 'campaign' | 'battle' | 'results' = 'campaign';
  let eraIndex = Math.min(7, Math.max(0, campaign.selectedEra));
  let productionExpanded = false;
  let tutorialStep = 0;
  let tutorialOpen = false;
  let panelFingerprint = '';
  let top: HTMLElement | null = null;
  let contextual: HTMLElement | null = null;
  let minimap: HTMLCanvasElement | null = null;
  let pauseButton: HTMLButtonElement | null = null;
  let battleRoot: HTMLElement | null = null;
  let modal: HTMLElement | null = null;
  let modalClose: (() => void) | null = null;
  let modalTrigger: HTMLElement | null = null;
  let destroyed = false;
  let campaignDirty = false;
  const groups = new Map<number, string[]>();
  const root = element('div', 'eightfold-app');
  const toasts = element('div', 'toast-stack'); toasts.setAttribute('aria-live', 'polite');
  append(parent, root, toasts);
  function applyLanguage(language: Language, save = false): void {
    setLanguage(language); document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = language === 'ar' ? 'EIGHTFOLD — فن القيادة' : 'Eightfold — The Art of Command';
    localizeTree(root); localizeTree(toasts);
    for (const control of root.querySelectorAll<HTMLElement>('[data-language]')) { const checked = control.dataset.language === language; control.classList.toggle('selected', checked); control.setAttribute('aria-checked', String(checked)); }
    if (save) { campaign.language = language; options.onLanguageChange(language); }
  }
  applyLanguage(getLanguage());
  const notify = (message: string) => {
    if (destroyed) return;
    const toast = element('div', 'toast', message); append(toasts, toast);
    window.setTimeout(() => toast.remove(), 5000);
  };
  const send = (command: Command) => options.onCommand(command);
  const definitions = new Map(content.eras.flatMap(era => era.units).map(unit => [unit.id, unit]));
  const ownUnits = () => state?.units.filter(unit => unit.owner === 0 && selection.units.includes(unit.id)) ?? [];
  const currentEra = () => content.eras[mission?.era ?? eraIndex]!;
  const purchased = (effect: string) => (screen === 'battle' && state ? state.factions[0].skills : campaign.skills).some(id => content.skills.some(skill => skill.id === id && skill.effect === effect && (skill.era === null || skill.era === (mission?.era ?? eraIndex))));
  const missionUnlocked = (item: MissionDef) => {
    const index = content.missions.findIndex(m => m.id === item.id);
    return index === 0 || !!campaign.records[content.missions[index - 1]!.id]?.victory || !!campaign.records[item.id]?.victory;
  };
  const nextMission = () => content.missions.find(item => missionUnlocked(item) && !campaign.records[item.id]?.victory) ?? content.missions[content.missions.length - 1]!;

  function run(action: () => Promise<void>, success?: string) {
    action().then(() => { if (success) notify(success); }).catch(error => notify(error instanceof Error ? error.message : 'That action could not be completed.'));
  }
  function brand(compact = false) {
    const wrap = element('div', compact ? 'brand compact' : 'brand');
    const mark = element('span', 'brand-mark'); mark.setAttribute('aria-hidden', 'true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 44 44');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M22 4v36M4 22h36M9.3 9.3l25.4 25.4M9.3 34.7L34.7 9.3'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '3.5'); path.setAttribute('stroke-linecap', 'round'); svg.append(path); mark.append(svg);
    append(wrap, mark, element('div', '', 'EIGHTFOLD'));
    if (!compact) append(wrap.lastElementChild as HTMLElement, element('small', '', 'THE ART OF COMMAND'));
    return wrap;
  }
  function closeModal() {
    const trigger=modalTrigger;const triggerId=trigger?.dataset.testid;
    if(modalClose)modalClose();modal?.remove();modal=null;modalClose=null;modalTrigger=null;
    if(campaignDirty&&screen==='campaign'){campaignDirty=false;renderCampaign();}
    if(trigger?.isConnected)trigger.focus();else if(triggerId)root.querySelector<HTMLElement>(`[data-testid="${triggerId}"]`)?.focus();
  }
  function openModal(name: string, className = '') {
    closeModal();
    modalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal = element('div', 'modal-backdrop');
    const dialog = element('section', `modal ${className}`); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); localAttribute(dialog, 'aria-label', name);
    const header = element('header', 'modal-header'); append(header, element('h2', '', name), withIcon(button('', closeModal, 'icon-button', 'Close (Escape)'), 'close'));
    append(dialog, header); append(modal, dialog); append(root, modal);
    modal.addEventListener('pointerdown', event => { if (event.target === modal) closeModal(); });
    window.setTimeout(() => dialog.querySelector<HTMLElement>('button')?.focus(), 0);
    return dialog;
  }
  function settings() {
    const dialog = openModal('Settings', 'settings-modal');
    const introduction = element('div', 'settings-introduction'); append(introduction, svgIcon('globe'), element('div', '', 'Choose your language')); append(dialog, introduction);
    append(dialog, element('p', 'modal-copy', 'Language changes immediately. Your battle is not restarted.'));
    const languages = element('div', 'language-options'); languages.setAttribute('role', 'radiogroup'); localAttribute(languages, 'aria-label', 'Interface language');
    for (const [language, title, subtitle] of [['en', 'English', 'English'], ['ar', 'العربية', 'Arabic']] as const) {
      const choice = button('', () => applyLanguage(language, true), 'language-option'); choice.dataset.language = language; choice.dataset.testid = `language-${language}`; choice.setAttribute('role', 'radio'); choice.setAttribute('aria-checked', String(getLanguage() === language)); choice.classList.toggle('selected', getLanguage() === language);
      append(choice, element('span', 'language-code', language === 'ar' ? 'ع' : 'Aa'), append(element('span', 'language-choice-copy'), element('strong', '', title), element('small', '', subtitle)), svgIcon('check')); append(languages, choice);
    }
    append(dialog, languages, element('p', 'settings-save-note', 'Your preference is saved automatically.'));
    const display = element('div', 'settings-row'); append(display, element('span', '', 'Fullscreen'), withIcon(button('Fullscreen', () => run(async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await parent.requestFullscreen(); }), 'secondary'), 'expand'));
    append(dialog, display, button('Done', closeModal, 'primary'));
  }
  function confirmLeave() {
    const dialog = openModal('Return to the campaign');
    append(dialog, element('p', 'modal-copy', 'Your battle will be saved at this exact point. You can resume it from the campaign.'), button('Save & return to campaign', () => { closeModal(); options.onLeave(); }, 'primary'));
  }
  function confirmConcede() {
    if (!state || state.ended) return;
    const dialog = openModal('Concede this battle');
    append(dialog, element('p', 'modal-copy', 'End this attempt as a defeat. Your campaign progress is retained. Eligible score rewards can be claimed once; previously claimed rewards are never repeated. You can redistribute knowledge before your next attempt.'));
    const confirm = button('Concede & review results', () => { if (!state || state.ended) return closeModal(); send({ type: 'surrender', side: 0 }); closeModal(); }, 'primary'); confirm.dataset.testid = 'confirm-concede';
    append(dialog, confirm, button('Continue this battle', closeModal, 'secondary'));
  }
  function help() {
    const dialog = openModal('A field guide to command', 'guide-modal');
    append(dialog, element('p', 'modal-copy', 'Capture the enemy main stronghold. Earn supplies from defeated units and first captures; there is no passive income. Your opponent follows the same rules.'));
    const grid = element('div', 'guide-grid');
    const bindings = [['Left-click / drag', 'Select a soldier, stronghold or group'], ['Right-click', 'Move, attack, capture or defend'], ['Shift + right-click', 'Append an order to your plan'], ['Spacebar', 'Pause both armies; keep planning'], ['W A S D / arrows', 'Pan the map'], ['Wheel / middle drag', 'Zoom / pan the map'], ['Ctrl + 1–9', 'Assign selected soldiers to a group'], ['Shift + 1–9', 'Add soldiers to a control group'], ['1–9', 'Recall a control group'], ['F / S / H', 'Cycle formation / stop / focus home'], ['Q / R / T / V', 'Unit ability / rally / recon / volley'], ['Escape', 'Close a panel or clear selection']];
    for (const [key, action] of bindings) append(grid, element('kbd', '', key), element('span', '', action));
    append(dialog, grid, button('Replay field tutorial', () => { closeModal(); tutorialStep = 0; tutorialOpen = true; campaign.tutorial = true; if (screen === 'battle') renderTutorial(); else notify('The field tutorial will begin when you enter a battle.'); }, 'secondary'));
  }
  function utilityBar() {
    const bar = element('div', 'utility-bar');
    const fileInput = element('input'); fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
    fileInput.onchange = () => { const file = fileInput.files?.[0]; if (file) run(() => options.onImport(file), 'Save imported. Your campaign is ready.'); fileInput.value = ''; };
    append(bar, withIcon(button('Export save', () => run(options.onExport)), 'upload'), withIcon(button('Import save', () => fileInput.click()), 'download'), fileInput);
    const offlineButton = withIcon(button('Download all eras', () => {
      offlineButton.disabled = true;
      run(async () => { try { await options.onOffline(value => { setText(offlineButton, `Downloading ${Math.round(value)}%`); }); setText(offlineButton, 'All eras available offline'); offlineButton.querySelector('svg')?.replaceWith(svgIcon('check')); } catch (error) { setText(offlineButton, 'Retry offline download'); offlineButton.querySelector('svg')?.replaceWith(svgIcon('download')); throw error; } finally { offlineButton.disabled = false; } });
    }), 'download'); offlineButton.dataset.testid = 'download-offline'; append(bar, offlineButton);
    return bar;
  }
  function renderCampaign() {
    renderer?.destroy(); renderer = null; state = null; mission = null; screen = 'campaign'; closeModal();
    root.replaceChildren(); root.classList.remove('in-battle');
    const shell = element('div', 'campaign-shell');
    const sidebar = element('aside', 'command-sidebar'); append(sidebar, brand());
    append(sidebar, element('p', 'sidebar-section-label', 'Command center'));
    const navigation = element('nav', 'command-navigation'); localAttribute(navigation, 'aria-label', 'Command center');
    const navCampaign = withIcon(button('Campaign', renderCampaign, 'nav-item active'), 'campaign'); navCampaign.setAttribute('aria-current','page');
    const navSkills = withIcon(button('Civilization', openSkills, 'nav-item'), 'tree');
    const navSettings=withIcon(button('Settings', settings, 'nav-item'), 'settings'); navSettings.dataset.testid='settings';
    append(navigation, navCampaign, navSkills, withIcon(button('Field guide',help,'nav-item'),'guide'),navSettings); append(sidebar,navigation);
    const wins=Object.values(campaign.records).filter(record=>record.victory).length;
    const progress=element('div','sidebar-progress'); append(progress,element('p','eyebrow','Campaign progress'),element('strong','',`${wins} / 40`));
    const bar=element('progress');bar.max=40;bar.value=wins;localAttribute(bar,'aria-label','Campaign progress');append(progress,bar,element('p','','FORTY BATTLES. EIGHT ERAS. YOUR LEGACY.'));append(sidebar,progress);
    const commander=element('div','local-commander');append(commander,append(element('div','commander-emblem'),svgIcon('guard')),append(element('div'),element('strong','','Local commander'),element('small','','Saved on this device')));append(sidebar,commander);
    const page = element('main', 'campaign-page');
    const head = element('header', 'campaign-header');
    const heading=element('div','campaign-heading');append(heading,element('p','eyebrow','Single-player campaign'),element('h2','','Campaign overview'));
    const headerActions = element('div', 'header-actions');
    const skillsButton = withIcon(button(`Civilization tree  ·  ${campaign.points} SP`, openSkills, 'knowledge-button'),'tree'); skillsButton.dataset.testid = 'skills';
    const languageControl=withIcon(button('Language',settings,'secondary language-shortcut'),'globe');languageControl.dataset.testid='language-settings';
    append(headerActions, skillsButton,languageControl);append(head,heading,headerActions);append(page,head);
    const eraHeading=element('div','era-heading');append(eraHeading,element('p','eyebrow','AGES OF CIVILIZATION'),element('span','',`${wins} / 40 BATTLES WON`));append(page,eraHeading);
    const tabs = element('nav', 'era-tabs'); localAttribute(tabs, 'aria-label', 'Civilization eras');
    content.eras.forEach((era, index) => {
      const unlocked = content.missions.some(item => item.era === index && missionUnlocked(item));
      const tab = button('', () => { eraIndex = index; campaign.selectedEra = index; renderCampaign(); run(options.onSave); }, `era-tab ${eraIndex === index ? 'active' : ''} ${unlocked ? '' : 'era-locked'}`, era.name);
      tab.setAttribute('aria-current', eraIndex === index ? 'page' : 'false');
      append(tab, label(ROMAN[index]!, 'era-roman'), label(SHORT_ERAS[index]!, 'era-short'));if(!unlocked)tab.append(svgIcon('lock','era-lock')); append(tabs, tab);
    }); append(page, tabs);
    const era = content.eras[eraIndex]!;
    const missions = content.missions.filter(item => item.era === eraIndex);
    const selected = missions.find(item => missionUnlocked(item) && !campaign.records[item.id]?.victory) ?? missions.find(item => missionUnlocked(item)) ?? missions[0]!;
    const feature = element('section', 'era-feature'); feature.style.setProperty('--era-accent', era.accent);
    const featureCopy = element('div', 'feature-copy');
    append(featureCopy, element('p', 'eyebrow hero-eyebrow', `THE ${ROMAN[eraIndex]} AGE  /  ${era.years}`), element('h1', '', era.name), element('p', 'era-subtitle', era.subtitle), element('p', 'era-description', era.description));
    const missionTeaser = element('div', 'next-mission');
    append(missionTeaser, label(missionUnlocked(selected) ? (campaign.records[selected.id]?.victory ? 'RETURN TO THE FIELD' : 'YOUR NEXT COMMAND') : 'THE NEXT CHAPTER', 'eyebrow'), element('h3', '', selected.name));
    const start = button(missionUnlocked(selected) ? `${campaign.records[selected.id]?.victory ? 'Replay' : 'Begin'} battle` : 'Complete the previous age to unlock', () => options.onStart(selected.id, false), 'primary'); start.disabled = !missionUnlocked(selected); start.dataset.testid = 'start-battle';
    start.append(svgIcon('arrow','directional'));append(missionTeaser, start);
    if (savedBattle && !savedBattle.ended) {
      const resumeMission = content.missions.find(item => item.id === savedBattle?.missionId);
      if (resumeMission) { const resume = button(`↶ Resume ${resumeMission.name} · ${clock(savedBattle.time)}`, () => options.onStart(resumeMission.id, true), 'resume-link'); resume.dataset.testid = 'resume-battle'; append(missionTeaser, resume); }
    }
    append(featureCopy, missionTeaser);
    const art = element('div', 'feature-art');
    const image = element('img'); image.src = './art/campaign-cover.webp'; image.alt = ''; image.draggable = false; image.width=1916;image.height=821;
    append(art, image);
    append(feature, featureCopy, art); append(page, feature);
    const eraDetail=element('div','era-detail');const eraImage=element('img');eraImage.src=era.art;eraImage.alt='';eraImage.width=120;eraImage.height=82;append(eraDetail,eraImage,append(element('div','era-detail-copy'),element('span','eyebrow','Mission intelligence'),element('strong','',selected.subtitle)),stat('Deployment budget',`${selected.resources[0]}`),stat('Base army',`${selected.capacity}`),stat('Strategic sites',`${selected.strongholds.length-2}`));append(page,eraDetail);
    const missionsHeader = element('div', 'section-heading'); append(missionsHeader, element('h2', '', 'Choose your next battle'), element('span', '', 'Five fields. Five different ways to think.')); append(page, missionsHeader);
    const cards = element('div', 'mission-grid');
    missions.forEach(item => {
      const record = campaign.records[item.id]; const unlocked = missionUnlocked(item);
      const card = button('', () => showMission(item), `mission-card ${!unlocked ? 'locked' : ''} ${record?.victory ? 'completed' : ''} ${item.id === selected.id ? 'next' : ''}`);
      const cardTop = element('div', 'mission-card-top'); append(cardTop, label(String(item.index + 1).padStart(2, '0'), 'mission-number'), label(record?.victory ? '✓ COMPLETE' : unlocked ? 'AVAILABLE' : 'LOCKED', 'mission-state'));
      const preview=element('div','mission-preview');append(preview,mapPreview(item));const pin=element('span','mission-preview-marker');pin.append(svgIcon(record?.victory?'check':unlocked?'flag':'lock'));preview.append(pin);
      append(card, preview,cardTop, element('h3', '', item.name), element('p', '', item.subtitle));
      const bottom = element('div', 'mission-card-bottom'); append(bottom, label(item.finale ? 'ERA FINALE ✦' : `BATTLE ${item.index + 1}`, item.finale ? 'finale-tag' : ''), record?.bestScore ? label(`${number(record.bestScore)} SCORE`) : unlocked ? label('VIEW BRIEFING ↗') : svgIcon('lock')); append(card, bottom); append(cards, card);
    }); append(page, cards);
    const footer = element('footer', 'campaign-footer'); append(footer, append(element('div','save-status'),element('i','status-dot'),label('All progress is saved automatically.','footer-note')), utilityBar()); append(page, footer);
    append(shell,sidebar,page);append(root,shell);
  }
  function showMission(item: MissionDef) {
    const unlocked = missionUnlocked(item); const record = campaign.records[item.id];
    const dialog = openModal(item.name, 'briefing-modal');
    append(dialog, append(element('div','briefing-map'),mapPreview(item)));
    append(dialog, element('p', 'eyebrow', `AGE ${ROMAN[item.era]} / BATTLE ${item.index + 1}${item.finale ? ' / ERA FINALE' : ''}`), element('p', 'briefing-subtitle', item.subtitle), element('p', 'modal-copy', item.briefing));
    const facts = element('div', 'briefing-facts');
    append(facts, stat('STARTING SUPPLIES', number(item.resources[0])), stat('BASE CAPACITY', `${item.capacity}`), stat('TARGET TIME', clock(item.parTime)), stat('BEST SCORE', record ? number(record.bestScore) : '—'));
    append(dialog, facts, element('p', 'objective-note', 'OBJECTIVE · Capture the enemy main stronghold.'),element('p','mission-concept',item.concept));
    const roster=element('div','briefing-roster');for(const unit of content.eras[item.era]!.units.filter(unit=>item.roster.includes(unit.role)&&(!unit.skill||campaign.skills.includes(unit.skill)))){const chip=element('span','roster-chip');localAttribute(chip,'title',unit.description);append(chip,svgIcon(unit.role),label(unit.name));append(roster,chip);}append(dialog,roster);
    if (unlocked) append(dialog, button(record?.victory ? 'Replay battle →' : 'Take command →', () => { closeModal(); options.onStart(item.id, false); }, 'primary'));
    else append(dialog, element('p', 'locked-note', 'Win the previous battle to unlock this field. You can inspect every era while you progress.'));
  }
  function stat(name: string, value: string) { return append(element('div', 'stat'), element('small', '', name), element('strong', '', value)); }

  function beginBattle(missionId: string) {
    const found = content.missions.find(item => item.id === missionId); if (!found) return notify('This mission is unavailable.');
    renderer?.destroy(); closeModal(); root.replaceChildren(); root.classList.add('in-battle');
    mission = found; state = null; screen = 'battle'; selection = { units: [], stronghold: null }; panelFingerprint = ''; groups.clear(); productionExpanded = false;
    battleRoot = element('main', 'battle-shell');
    top = element('header', 'battle-top');
    append(top, brand(true));
    const missionHeading = element('div', 'battle-mission'); append(missionHeading, element('small', '', `${ROMAN[found.era]} / ${String(found.index + 1).padStart(2, '0')}`), element('strong', '', found.name)); append(top, missionHeading);
    const telemetry = element('div', 'telemetry');
    for (const [key, caption] of [['supplies', 'SUPPLIES'], ['army', 'ARMY'], ['score', 'SCORE'], ['time', 'TIME']]) { const item = stat(caption!, '—'); item.dataset.stat = key; item.prepend(svgIcon(key==='time'?'clock':key as IconName)); append(telemetry, item); }
    pauseButton = withIcon(button('Pause', () => { if (state) send({ type: 'pause', value: !state.paused }); }, 'pause-button', 'Tactical pause (Space)'), 'pause');
    pauseButton.dataset.testid = 'pause';
    const battleSettings=withIcon(button('',settings,'icon-button','Settings'),'settings');battleSettings.dataset.testid='battle-settings';
    append(top, telemetry, pauseButton, withIcon(button('Civilization', openSkills, 'quiet-button'),'tree'), battleSettings,withIcon(button('', battleMenu, 'icon-button', 'Battle menu'),'menu'));
    const viewport = element('div', 'battle-viewport'); viewport.id = 'battle-viewport'; localAttribute(viewport, 'aria-label', 'Isometric battle map');
    contextual = element('section', 'context-panel'); localAttribute(contextual, 'aria-label', 'Selected object controls');
    const minimapWrap = element('aside', 'minimap-wrap'); append(minimapWrap, element('div', 'minimap-label', 'THE FIELD  /  LEFT: VIEW · RIGHT: ORDER'));
    minimap = element('canvas', 'minimap'); minimap.width = 480; minimap.height = 264; localAttribute(minimap, 'aria-label', 'Interactive minimap'); minimap.dataset.testid = 'minimap'; minimap.tabIndex = 0;
    minimap.addEventListener('pointerdown', minimapPointer); minimap.addEventListener('contextmenu', event => event.preventDefault());
    append(minimapWrap, minimap, element('div', 'minimap-legend', '● YOUR ARMY   ● ENEMY IN SIGHT   ◇ STRONGHOLD'));
    const planning=element('div','pause-indicator');append(planning,svgIcon('pause'),label('TACTICAL PAUSE · PLAN FREELY'));planning.hidden=true;
    const mapControls=element('div','map-controls');append(mapControls,withIcon(button('',selectHome,'map-control','Main stronghold'),'home'),withIcon(button('',()=>{if(!state)return;selection={units:state.units.filter(unit=>unit.owner===0).map(unit=>unit.id),stronghold:null};renderer?.setSelection(selection);panelFingerprint='';renderContext();},'map-control','Select all soldiers'),'select'),withIcon(button('',help,'map-control','Battle controls'),'guide'));
    append(viewport,planning,mapControls);append(battleRoot, top, viewport, contextual, minimapWrap); append(root, battleRoot);
    renderer = createRenderer({ parent: viewport, content, mission: found, onSelect: (incoming, additive) => {
      selection = { units: additive ? [...new Set([...selection.units, ...incoming.units])] : incoming.units, stronghold: incoming.stronghold };
      if (selection.stronghold) selection.units = [];
      renderer?.setSelection(selection); panelFingerprint = ''; renderContext();
    }, onOrder: (order, additive) => { if (selection.units.length) send({ type: 'order', side: 0, ids: [...selection.units], order, append: additive }); } });
    viewport.addEventListener('camera-move', drawMinimap);
    tutorialOpen = tutorialOpen || campaign.tutorial; renderTutorial(); renderContext();
  }
  function battleMenu() {
    const dialog = openModal('Command desk', 'battle-menu');
    const concede = button('Concede battle', confirmConcede, 'secondary'); concede.disabled = !state || state.ended; concede.dataset.testid = 'concede-battle';
    append(dialog, element('p', 'modal-copy', 'The field continues while this menu is open. Use tactical pause whenever you need time to think.'), withIcon(button('Field guide & controls', help, 'secondary'),'guide'),withIcon(button('Settings',settings,'secondary'),'settings'),withIcon(button('Save now', () => run(options.onSave, 'Battle saved.'), 'secondary'),'check'), withIcon(button('Export complete save', () => run(options.onExport), 'secondary'),'upload'), concede, button('Return to campaign', confirmLeave, 'primary'));
  }
  function renderTutorial() {
    battleRoot?.querySelector('.tutorial-card')?.remove(); if (!battleRoot || !tutorialOpen || screen !== 'battle') return;
    const tutorial = TUTORIALS[tutorialStep]!;
    const card = element('aside', 'tutorial-card');
    const header = element('div', 'tutorial-header'); append(header, label(tutorial.key, 'eyebrow'), button('Skip', () => { tutorialOpen = false; campaign.tutorial = false; run(options.onSave); renderTutorial(); }, 'text-button'));
    append(card, header, element('h3', '', tutorial.name), element('p', '', tutorial.text));
    if (mission?.tutorial) append(card, element('p', 'mission-tutorial-note', mission.tutorial));
    const controls = element('div', 'tutorial-controls'); append(controls, label(`${tutorialStep + 1} / ${TUTORIALS.length}`, 'eyebrow'), button(tutorialStep === TUTORIALS.length - 1 ? 'Take command ✓' : 'Next →', () => {
      if (tutorialStep < TUTORIALS.length - 1) tutorialStep++; else { tutorialOpen = false; campaign.tutorial = false; run(options.onSave); }
      renderTutorial();
    }, 'text-button')); append(card, controls); append(battleRoot, card);
  }
  function setState(next: BattleState) {
    if (screen !== 'battle') return; state = next;
    selection.units = selection.units.filter(id => next.units.some(unit => unit.id === id && unit.owner === 0));
    renderer?.setState(next); renderer?.setSelection(selection);
    const values: Record<string, string> = { supplies: number(next.factions[0].resources), army: `${usage(next, 0, content)} / ${capacity(next, 0, content)}`, score: number(next.factions[0].score), time: clock(next.time) };
    for (const [key, value] of Object.entries(values)) { const item = top?.querySelector(`[data-stat="${key}"] strong`); if (item) setText(item, value); }
    if (pauseButton) {
      setText(pauseButton, next.paused ? 'Resume' : 'Pause');
      if (pauseButton.getAttribute('aria-pressed') !== String(next.paused)) pauseButton.querySelector('svg')?.replaceWith(svgIcon(next.paused ? 'play' : 'pause'));
      pauseButton.classList.toggle('is-paused', next.paused); pauseButton.setAttribute('aria-pressed', String(next.paused));
    }
    battleRoot?.classList.toggle('tactical-pause', next.paused);
    const indicator=battleRoot?.querySelector<HTMLElement>('.pause-indicator');if(indicator)indicator.hidden=!next.paused;
    const fp = contextKey(); if (fp !== panelFingerprint) { panelFingerprint = fp; renderContext(); }
    patchContext();
    drawMinimap();
  }
  function contextKey() {
    if (!state) return 'loading';
    const selected = ownUnits();
    const stronghold = state.strongholds.find(item => item.id === selection.stronghold);
    const faction = state.factions[0];
    return JSON.stringify([selection.units, selection.stronghold, state.paused, selected.map(unit => [unit.defId, unit.formation, unit.orders]), stronghold?.owner, stronghold?.capturing, faction.lines.map(line => [line.id, line.blocked, line.queue.map(job => [job.id, job.started])]), faction.reserves, faction.autoDeploy, faction.skills]);
  }
  function unitSummary(selected: Unit[]) {
    const health = `${number(selected.reduce((sum, unit) => sum + unit.hp, 0))} / ${number(selected.reduce((sum, unit) => sum + (definitions.get(unit.defId)?.hp ?? unit.hp), 0))} health`;
    const def = definitions.get(selected[0]?.defId ?? '');
    return selected.length === 1 && def ? `${health} · ${def.damage} damage · ${def.armor} armor · ${def.range} range · ${def.vision} vision` : `${health} · ${[...new Set(selected.map(unit => definitions.get(unit.defId)?.role))].join(', ')}`;
  }
  function patchContext() {
    if (!contextual || !state) return;
    const faction = state.factions[0];
    const selected = ownUnits();
    if (selected.length) {
      const health = contextual.querySelector('[data-health]');
      if (health) setText(health, unitSummary(selected));
      const unitAbility = contextual.querySelector<HTMLButtonElement>('[data-unit-ability]'); if (unitAbility) { const cooldown = selected[0]!.abilityCooldown; setText(unitAbility, cooldown > 0 ? `Ability ${Math.ceil(cooldown)}s` : 'Unit ability · Q'); unitAbility.disabled = selected.every(unit => unit.abilityCooldown > 0) || faction.resources < 4; }
    }
    for (const node of contextual.querySelectorAll<HTMLButtonElement>('[data-ability]')) { const ability = node.dataset.ability as 'rally' | 'recon' | 'volley'; const cooldown = faction.cooldowns[ability] ?? 0; setText(node, `${titleCase(ability)} · ${cooldown > 0 ? `${Math.ceil(cooldown)}s` : `${RULES.abilityCosts[ability]} supplies`}`); node.disabled = cooldown > 0 || faction.resources < RULES.abilityCosts[ability]; }
    for (const card of contextual.querySelectorAll<HTMLButtonElement>('[data-recruit]')) { const def = definitions.get(card.dataset.recruit!); card.disabled = !def || faction.resources < def.cost; }
    for (const node of contextual.querySelectorAll<HTMLElement>('[data-job]')) {
      const job = faction.lines.flatMap(line => line.queue).find(job => job.id === node.dataset.job); if (!job) continue;
      const time = node.querySelector('.job-time'); if (time) setText(time, job.started ? `${Math.ceil(job.remaining)}s` : 'QUEUED'); const progress = node.querySelector('progress'); if (progress) progress.value = Math.max(0, job.total - job.remaining);
    }
    for (const node of contextual.querySelectorAll<HTMLElement>('[data-production-line]')) { const line = faction.lines[Number(node.dataset.productionLine)]; if (line) setText(node, line.blocked ? blockedReason(line.queue[0]?.unitId) : line.queue.length ? 'TRAINING' : 'READY'); }
    const production = contextual.querySelector('[data-production-capacity]'); if (production) setText(production, `${usage(state, 0, content)} / ${capacity(state, 0, content)} army capacity · ${faction.reserves.length} / ${faction.reserveCapacity} reserve slots · ${faction.lines.length} production ${faction.lines.length === 1 ? 'line' : 'lines'}`);
    for (const node of contextual.querySelectorAll<HTMLButtonElement>('[data-deploy]')) { const reserve = faction.reserves.find(unit => unit.id === node.dataset.deploy); node.disabled = !reserve || usage(state, 0, content) + (definitions.get(reserve.unitId)?.capacity ?? 1) > capacity(state, 0, content); }
    const capture = contextual.querySelector<HTMLProgressElement>('.capture-display progress'); const stronghold = state.strongholds.find(item => item.id === selection.stronghold); if (capture && stronghold) capture.value = Math.min(1, stronghold.progress / 100);
  }
  function panelHeading(name: string, kicker: string, detail: string) {
    const header = element('div', 'context-heading'); const copy = element('div'); append(copy, element('span', 'eyebrow', kicker), element('h2', '', name), element('p', '', detail)); append(header, copy); return header;
  }
  function renderContext() {
    if (!contextual) return; contextual.replaceChildren(); contextual.classList.toggle('expanded', productionExpanded); queueMicrotask(patchContext);
    if (!state || !mission) { append(contextual, panelHeading('Taking the field', 'COMMAND DESK', 'Preparing your army…')); return; }
    const selected = ownUnits();
    const stronghold = state.strongholds.find(item => item.id === selection.stronghold);
    if (selected.length) return renderUnitPanel(selected);
    if (stronghold) {
      if (stronghold.kind === 'main' && stronghold.owner === 0) return renderProduction();
      const owned = stronghold.owner === 0; const visible = isVisible(stronghold);
      const owner = owned ? 'YOUR CONTROL' : !visible ? 'LAST KNOWN CONTROL' : stronghold.owner === 1 ? 'ENEMY CONTROL' : 'NEUTRAL';
      const heading = panelHeading(stronghold.name, `${titleCase(stronghold.kind)} / ${owner}`, owned ? 'Hold this position to retain its strategic advantage.' : 'Move soldiers into its capture ring to establish control.');
      append(contextual, heading);
      const facts = element('div', 'stronghold-stats');
      append(facts, stat('CAPACITY BONUS', `+${stronghold.capacity}`), stat('FIRST CAPTURE', `${stronghold.reward} supplies`), stat('VISION', `${stronghold.vision} cells`));
      if (visible || owned) { const progress = element('progress'); progress.max = 1; progress.value = Math.min(1, stronghold.progress / 100); append(facts, append(element('div', 'capture-display'), label(stronghold.capturing === null ? 'STABLE' : 'CAPTURE IN PROGRESS', 'eyebrow'), progress)); }
      append(contextual, facts); return;
    }
    const empty = element('div', 'empty-context');
    append(empty, append(element('div', 'context-emblem'), svgIcon('target')), panelHeading(state.paused ? 'The field is yours to plan.' : 'A clear view. A considered move.', state.paused ? 'TACTICAL PAUSE' : 'COMMAND DESK', 'Select soldiers for orders, or your main stronghold to recruit. Shift + right-click adds to a plan.'));
    const actions = element('div', 'empty-actions'); append(actions, button('⌂ Main stronghold', selectHome, 'secondary'), button('Controls ↗', help, 'text-button'));
    for (const ability of ['rally', 'recon', 'volley'] as const) if (purchased(ability)) { const abilityButton = button(`${titleCase(ability)} · ${RULES.abilityCosts[ability]} supplies`, () => triggerAbility(ability), 'small-button'); abilityButton.dataset.ability = ability; append(actions, abilityButton); }
    append(empty, actions); append(contextual, empty);
  }
  function selectHome() {
    const home = state?.strongholds.find(item => item.kind === 'main' && item.owner === 0); if (!home) return;
    selection = { units: [], stronghold: home.id }; renderer?.setSelection(selection); renderer?.focus(home.x, home.y); panelFingerprint = ''; renderContext();
  }
  function renderUnitPanel(selected: Unit[]) {
    if (!contextual || !state) return;
    const lead = selected[0]!; const def = definitions.get(lead.defId)!;
    const heading = panelHeading(selected.length === 1 ? def.name : `${selected.length} soldiers selected`, 'FIELD COMMAND', unitSummary(selected));
    heading.querySelector('p')!.dataset.health = '';
    append(heading, button('Clear ×', () => { selection = { units: [], stronghold: null }; renderer?.setSelection(selection); renderContext(); }, 'text-button')); append(contextual, heading);
    const body = element('div', 'unit-panel-body');
    const commands = element('div', 'unit-actions');
    const formationRow = element('div', 'formation-row');
    for (const formation of FORMATIONS) {
      if (!['line', 'column'].includes(formation) && !purchased('formations')) continue;
      const item = button(titleCase(formation), () => send({ type: 'formation', side: 0, ids: [...selection.units], formation }), `small-button ${lead.formation === formation ? 'selected' : ''}`);
      append(formationRow, item);
    }
    append(commands, label('FORMATION  /  F TO CYCLE', 'eyebrow'), formationRow);
    const actionRow = element('div', 'action-row');
    const unitAbilityButton = button(lead.abilityCooldown > 0 ? `Ability ${Math.ceil(lead.abilityCooldown)}s` : 'Unit ability · Q', () => send({ type: 'unitAbility', side: 0, ids: [...selection.units] }), 'small-button', 'Activate selected soldiers: 4 supplies each, 18 second cooldown'); unitAbilityButton.dataset.unitAbility = '';
    append(actionRow, button('Stop · S', () => send({ type: 'editOrders', side: 0, ids: [...selection.units], orders: [] }), 'small-button'), button('Defend here', () => { const unit = ownUnits()[0]; if (unit) send({ type: 'order', side: 0, ids: [...selection.units], order: { kind: 'defend', x: unit.x, y: unit.y } }); }, 'small-button'), unitAbilityButton);
    append(commands, actionRow);
    const tactical = element('div', 'action-row');
    for (const ability of ['rally', 'recon', 'volley'] as const) {
      if (!purchased(ability)) continue;
      const cooldown = state.factions[0].cooldowns[ability] ?? 0;
      const item = button(`${titleCase(ability)}${cooldown > 0 ? ` · ${Math.ceil(cooldown)}s` : ` · ${RULES.abilityCosts[ability]} supplies`}`, () => triggerAbility(ability), 'small-button'); item.dataset.ability = ability; item.disabled = cooldown > 0; append(tactical, item);
    }
    const engineer = selected.some(unit => definitions.get(unit.defId)?.role === 'engineer');
    if (engineer) for (const kind of ['barrier', 'tower'] as const) append(tactical, button(`Build ${kind}`, () => buildDialog(kind), 'small-button'));
    append(commands, tactical);
    const queue = element('div', 'orders-panel');
    const queueHeader = element('div', 'orders-heading'); append(queueHeader, label(`PLANNED ORDERS  /  ${lead.orders.length}`, 'eyebrow'), button('+ Add waypoint', () => editOrderDialog(null), 'text-button')); append(queue, queueHeader);
    if (!lead.orders.length) append(queue, element('p', 'queue-empty', 'Right-click on the field to issue an order. Hold Shift to append.'));
    const list = element('ol', 'order-list');
    lead.orders.forEach((order, index) => {
      const row = element('li', index === 0 ? 'active' : '');
      append(row, label(`${index === 0 ? '▶' : index + 1}`, 'order-index'), button(`${titleCase(order.kind)} → ${order.x.toFixed(0)}, ${order.y.toFixed(0)}`, () => editOrderDialog(index), 'order-name'));
      const up = button('↑', () => reorderOrder(index, -1), 'queue-icon', 'Move order earlier'); up.disabled = index === 0;
      const down = button('↓', () => reorderOrder(index, 1), 'queue-icon', 'Move order later'); down.disabled = index === lead.orders.length - 1;
      append(row, up, down, button('×', () => { const orders = ownUnits()[0]?.orders.map(item => ({ ...item })) ?? []; orders.splice(index, 1); send({ type: 'editOrders', side: 0, ids: [...selection.units], orders }); }, 'queue-icon', 'Cancel order')); append(list, row);
    }); append(queue, list);
    append(body, commands, queue); append(contextual, body);
  }
  function reorderOrder(index: number, direction: number) {
    const orders = ownUnits()[0]?.orders.map(item => ({ ...item })) ?? []; const destination = index + direction;
    if (destination < 0 || destination >= orders.length) return;
    [orders[index], orders[destination]] = [orders[destination]!, orders[index]!];
    send({ type: 'editOrders', side: 0, ids: [...selection.units], orders });
  }
  function editOrderDialog(index: number | null) {
    const current = ownUnits()[0]; if (!current || !mission) return;
    const existing = index === null ? { kind: 'move' as const, x: current.x, y: current.y } : current.orders[index]; if (!existing) return;
    const ids = [...selection.units];
    const dialog = openModal(index === null ? 'Add a planned order' : `Edit order ${index + 1}`);
    const form = element('form', 'order-form');
    const kind = element('select'); for (const name of ['move', 'attack', 'defend', 'capture', 'rally'] as const) { const option = element('option', '', titleCase(name)); option.value = name; append(kind, option); } kind.value = existing.kind;
    const x = element('input'); x.type = 'number'; x.min = '0'; x.max = String(mission.map[0]!.length - 1); x.step = '1'; x.value = String(Math.round(existing.x)); x.required = true;
    const y = element('input'); y.type = 'number'; y.min = '0'; y.max = String(mission.map.length - 1); y.step = '1'; y.value = String(Math.round(existing.y)); y.required = true;
    const field = (name: string, control: HTMLElement) => { localAttribute(control, 'aria-label', name); return append(element('label', 'form-field'), label(name), control); };
    append(form, field('ORDER', kind), field('MAP X', x), field('MAP Y', y));
    const submit = element('button', 'primary', index === null ? 'Add to plan' : 'Update plan'); submit.type = 'submit';
    append(form, element('p', 'form-note', `Applies this plan to ${ids.length} selected soldier${ids.length === 1 ? '' : 's'}. You can also append orders with Shift + right-click.`), submit);
    form.onsubmit = event => { event.preventDefault(); const unit = state?.units.find(item => item.id === ids[0]); if (!unit) return closeModal(); const orders = unit.orders.map(item => ({ ...item })); const order: Order = { kind: kind.value as Order['kind'], x: Number(x.value), y: Number(y.value) }; if (order.kind === 'capture') { const target = state?.strongholds.find(item => Math.hypot(item.x - order.x, item.y - order.y) < 3); if (target) { order.target = target.id; order.x = target.x; order.y = target.y; } } if (index === null) orders.push(order); else orders[index] = order; send({ type: 'editOrders', side: 0, ids, orders }); closeModal(); };
    append(dialog, form);
  }
  function triggerAbility(ability: 'rally' | 'recon' | 'volley') {
    if (!state || !mission || !purchased(ability)) return notify('Unlock this tactical ability in the civilization tree.');
    const cooldown = state.factions[0].cooldowns[ability] ?? 0;
    if (cooldown > 0) return notify(`${titleCase(ability)} is ready in ${Math.ceil(cooldown)} seconds.`);
    if (state.factions[0].resources < RULES.abilityCosts[ability]) return notify(`${titleCase(ability)} needs ${RULES.abilityCosts[ability]} supplies.`);
    const units = ownUnits(); const home = state.strongholds.find(item => item.owner === 0 && item.kind === 'main');
    const point = units[0]?.orders[0] ?? units[0] ?? home;
    if (!point) return;
    const dialog = openModal(`${titleCase(ability)} · select a target`); const form = element('form', 'order-form');
    const x = element('input'); x.type = 'number'; x.min = '0'; x.max = String(mission.map[0]!.length - 1); x.value = String(Math.round(point.x)); x.required = true;
    const y = element('input'); y.type = 'number'; y.min = '0'; y.max = String(mission.map.length - 1); y.value = String(Math.round(point.y)); y.required = true;
    const descriptions = { rally: 'Restore 28% health to your soldiers within 4 cells. The target must be visible.', recon: 'Reveal a 9-cell area for 12 seconds. Recon can target undiscovered ground.', volley: 'Deal 45 damage to legally visible enemies within 2.4 cells. The target must be visible.' };
    append(form, append(element('label', 'form-field'), label('MAP X'), x), append(element('label', 'form-field'), label('MAP Y'), y), element('p', 'form-note', `${descriptions[ability]} Cost: ${RULES.abilityCosts[ability]} supplies. Cooldown: ${RULES.abilityCooldowns[ability]} seconds.`));
    const submit = element('button', 'primary', `Use ${ability}`); submit.type = 'submit'; append(form, submit);
    form.onsubmit = event => { event.preventDefault(); const target = { x: Number(x.value), y: Number(y.value) }; if (ability !== 'recon' && !isVisible(target)) return notify('Choose a target within your current vision.'); send({ type: 'ability', side: 0, ability, ...target }); closeModal(); };
    append(dialog, form);
  }
  function buildDialog(kind: 'barrier' | 'tower') {
    const current = ownUnits()[0]; if (!current || !mission) return;
    const dialog = openModal(`Build a ${kind}`); const form = element('form', 'order-form');
    const x = element('input'); x.type = 'number'; x.min = '0'; x.max = String(mission.map[0]!.length - 1); x.value = String(Math.round(current.x + 2)); x.required = true;
    const y = element('input'); y.type = 'number'; y.min = '0'; y.max = String(mission.map.length - 1); y.value = String(Math.round(current.y)); y.required = true;
    append(form, append(element('label', 'form-field'), label('MAP X'), x), append(element('label', 'form-field'), label('MAP Y'), y), element('p', 'form-note', `Choose a nearby clear cell. Base cost: ${kind === 'barrier' ? RULES.barrierCost : RULES.towerCost} supplies before construction upgrades. Blocked or unaffordable sites are rejected.`));
    const submit = element('button', 'primary', `Issue construction order`); submit.type = 'submit'; append(form, submit);
    form.onsubmit = event => { event.preventDefault(); send({ type: 'build', side: 0, ids: [...selection.units], kind, x: Number(x.value), y: Number(y.value) }); closeModal(); }; append(dialog, form);
  }

  function renderProduction() {
    if (!contextual || !state || !mission) return;
    const faction = state.factions[0];
    const heading = panelHeading('Main stronghold', 'RECRUITMENT & RESERVES', `${usage(state, 0, content)} / ${capacity(state, 0, content)} army capacity · ${faction.reserves.length} / ${faction.reserveCapacity} reserve slots · ${faction.lines.length} production ${faction.lines.length === 1 ? 'line' : 'lines'}`);
    heading.querySelector('p')!.dataset.productionCapacity = '';
    append(heading, button(productionExpanded ? 'Collapse ↓' : 'Expand ↑', () => { productionExpanded = !productionExpanded; renderContext(); }, 'text-button')); append(contextual, heading);
    const body = element('div', 'production-body'); const roster = element('div', 'recruit-roster');
    const units = unlockedUnits(state, 0, content);
    for (const unit of units) {
      const card = button('', () => send({ type: 'recruit', side: 0, unitId: unit.id }), 'recruit-card', `${unit.description}\n${unit.hp} health · ${unit.damage} damage · ${unit.armor} armor · ${unit.range} range · ${unit.vision} vision`);
      card.dataset.recruit = unit.id; card.dataset.testid = `recruit-${unit.id}`;
      const portrait = element('span', `unit-role-icon ${unit.role}`); portrait.append(svgIcon(unit.role));
      const trainingBonus = content.skills.reduce((total, skill) => total + (faction.skills.includes(skill.id) && skill.effect === 'training' && (skill.era === null || skill.era === mission!.era) ? skill.value : 0), 0);
      const trainingTime = unit.training * Math.max(.35, 1 - trainingBonus);
      const details = element('div'); append(details, element('strong', '', unit.name), element('small', '', `${unit.cost} supplies · ${unit.capacity} cap · ${Math.round(trainingTime * 10) / 10}s`));
      append(card, portrait, details, label('+', 'recruit-plus')); card.disabled = faction.resources < unit.cost; localAttribute(card, 'aria-label', `Recruit ${unit.name}, ${unit.cost} supplies, ${unit.capacity} capacity, ${Math.round(trainingTime * 10) / 10} seconds`); append(roster, card);
    }
    if (!units.length) append(roster, element('p', 'queue-empty', 'No units currently unlocked for this mission.'));
    const factory = element('div', 'factory-panel');
    const lines = element('div', 'production-lines');
    faction.lines.forEach((line, lineIndex) => {
      const row = element('div', `production-line ${line.blocked ? 'blocked' : ''}`);
      const header = element('div', 'production-line-heading'); const status = label(line.blocked ? blockedReason(line.queue[0]?.unitId) : line.queue.length ? 'TRAINING' : 'READY', 'line-status'); status.dataset.productionLine = String(lineIndex); append(header, label(`LINE ${lineIndex + 1}`, 'eyebrow'), status); append(row, header);
      if (!line.queue.length) append(row, element('div', 'queue-empty', 'Recruit a soldier to begin training.'));
      const jobs = element('div', 'training-jobs');
      line.queue.forEach((job, index) => {
        const def = definitions.get(job.unitId); const jobItem = element('div', 'training-job'); jobItem.dataset.job = job.id;
        const progress = element('progress'); progress.max = job.total || 1; progress.value = Math.max(0, job.total - job.remaining);
        append(jobItem, element('span', 'job-name', def?.name ?? job.unitId), label(job.started ? `${Math.ceil(job.remaining)}s` : 'QUEUED', 'job-time'), button('×', () => send({ type: 'cancelTraining', side: 0, line: lineIndex, jobId: job.id }), 'queue-icon', `Cancel ${def?.name ?? 'unit'} · ${job.started ? '50%' : '100%'} refund`));
        if (index === 0) append(jobItem, progress); append(jobs, jobItem);
      }); append(row, jobs); append(lines, row);
    }); append(factory, lines);
    const reserve = element('div', 'reserve-panel');
    const reserveHeader = element('div', 'reserve-heading'); append(reserveHeader, label(`RESERVES  /  ${faction.reserves.length}`, 'eyebrow'));
    const auto = button(faction.autoDeploy ? 'Auto deploy: ON' : 'Auto deploy: OFF', () => send({ type: 'autoDeploy', side: 0, value: !state!.factions[0].autoDeploy }), 'text-button'); auto.setAttribute('aria-pressed', String(faction.autoDeploy)); append(reserveHeader, auto); append(reserve, reserveHeader);
    if (!faction.reserves.length) append(reserve, element('p', 'queue-empty', 'Completed reinforcements wait here when your army is full.'));
    faction.reserves.forEach((unit, index) => {
      const row = element('div', 'reserve-unit'); const def = definitions.get(unit.unitId);
      const up = button('↑', () => reorderReserve(index, -1), 'queue-icon', 'Higher deployment priority'); up.disabled = index === 0;
      const down = button('↓', () => reorderReserve(index, 1), 'queue-icon', 'Lower deployment priority'); down.disabled = index === faction.reserves.length - 1;
      const deploy = button('Deploy', () => send({ type: 'deploy', side: 0, reserveId: unit.id }), 'text-button'); deploy.disabled = usage(state!, 0, content) + (def?.capacity ?? 1) > capacity(state!, 0, content);
      deploy.dataset.deploy = unit.id;
      append(row, label(`${index + 1}`, 'reserve-priority'), label(def?.name ?? unit.unitId, 'reserve-name'), up, down, deploy); append(reserve, row);
    }); append(factory, reserve); append(body, roster, factory); append(contextual, body);
    const activeBonuses = faction.skills.map(id => content.skills.find(skill => skill.id === id)).filter((skill): skill is SkillDef => !!skill && ['training', 'capacity', 'reserve', 'lines'].includes(skill.effect));
    append(contextual, element('div', 'production-note', `CANCEL: 100% before training · 50% after training begins. ${activeBonuses.length ? `ACTIVE: ${activeBonuses.map(skill => skill.name).join(' · ')}` : 'Select units in the field to return to tactical orders.'}`));
  }
  function roleIcon(unit: UnitDef) { return ({ frontline: '↟', ranged: '↗', guard: '◇', scout: '⌁', stealth: '◒', siege: '⊕', engineer: '⚒' })[unit.role]; }
  function blockedReason(unitId?: string) {
    if (!state) return 'BLOCKED';
    if (!state.factions[0].autoDeploy) return 'RESERVES FULL · DEPLOY MANUALLY';
    if (usage(state, 0, content) + (definitions.get(unitId ?? '')?.capacity ?? 1) > capacity(state, 0, content)) return 'CAPACITY & RESERVES FULL';
    return 'EXIT BLOCKED · CLEAR HOME';
  }
  function reorderReserve(index: number, direction: number) {
    if (!state) return; const ids = state.factions[0].reserves.map(unit => unit.id); const next = index + direction; if (next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next]!, ids[index]!]; send({ type: 'reservePriority', side: 0, ids });
  }
  function isVisible(point: Vec) {
    if (!state || !mission) return false;
    const x = Math.round(point.x), y = Math.round(point.y); if (x < 0 || y < 0 || x >= mission.map[0]!.length || y >= mission.map.length) return false; return !!state.fog[0].visible[y * mission.map[0]!.length + x];
  }
  function minimapPoint(event: PointerEvent) {
    if (!minimap || !mission) return null; const rect = minimap.getBoundingClientRect();
    return { x: Math.max(0, Math.min(mission.map[0]!.length - 0.1, (event.clientX - rect.left) / rect.width * mission.map[0]!.length)), y: Math.max(0, Math.min(mission.map.length - 0.1, (event.clientY - rect.top) / rect.height * mission.map.length)) };
  }
  function minimapPointer(event: PointerEvent) {
    const point = minimapPoint(event); if (!point || !state) return; event.preventDefault();
    if (event.button === 0) { renderer?.focus(point.x, point.y); return; }
    if (event.button !== 2 || !selection.units.length) return;
    const stronghold = state.strongholds.find(item => Math.hypot(item.x - point.x, item.y - point.y) < 1.8 && (item.owner === 0 || isVisible(item)));
    const enemy = state.units.find(unit => unit.owner === 1 && unitVisible(state!, unit, 0, content) && Math.hypot(unit.x - point.x, unit.y - point.y) < 1.2);
    const order: Order = enemy ? { kind: 'attack', x: enemy.x, y: enemy.y, target: enemy.id } : stronghold ? { kind: stronghold.owner === 0 ? 'defend' : 'capture', x: stronghold.x, y: stronghold.y, target: stronghold.id } : { kind: 'move', ...point };
    send({ type: 'order', side: 0, ids: [...selection.units], order, append: event.shiftKey });
  }
  function drawMinimap() {
    if (!minimap || !state || !mission) return; const ctx = minimap.getContext('2d'); if (!ctx) return;
    const width = mission.map[0]!.length, height = mission.map.length; const sx = minimap.width / width, sy = minimap.height / height;
    ctx.fillStyle = '#182c28'; ctx.fillRect(0, 0, minimap.width, minimap.height);
    const colors: Record<string, string> = { '.': '#c3c6aa', f: '#708c76', '^': '#a69d76', '~': '#83a5a4', '=': '#d0b68b', '#': '#796f59', g: '#c0ab80', c: '#a3ae8a' };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = y * width + x; if (!state.fog[0].explored[index]) continue;
      ctx.fillStyle = colors[mission.map[y]![x]!] ?? '#b7bda3'; ctx.globalAlpha = state.fog[0].visible[index] ? 1 : 0.35; ctx.fillRect(x * sx, y * sy, sx + 0.3, sy + 0.3);
    } ctx.globalAlpha = 1;
    for (const stronghold of state.strongholds) {
      const index = Math.round(stronghold.y) * width + Math.round(stronghold.x); if (!state.fog[0].explored[index] && stronghold.owner !== 0) continue;
      const visible = isVisible(stronghold); ctx.fillStyle = stronghold.owner === 0 ? '#2a9d8e' : visible && stronghold.owner === 1 ? '#cf715d' : '#e3d9be';
      ctx.strokeStyle = '#18332e'; ctx.lineWidth = 1.5; const size = stronghold.kind === 'main' ? 10 : 6; ctx.fillRect(stronghold.x * sx - size / 2, stronghold.y * sy - size / 2, size, size); ctx.strokeRect(stronghold.x * sx - size / 2, stronghold.y * sy - size / 2, size, size);
    }
    for (const unit of state.units) {
      if (unit.owner !== 0 && !unitVisible(state, unit, 0, content)) continue;
      ctx.fillStyle = unit.owner === 0 ? '#2a9d8e' : '#dd806a'; ctx.strokeStyle = selection.units.includes(unit.id) ? '#ffffff' : '#19362f'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(unit.x * sx, unit.y * sy, selection.units.includes(unit.id) ? 4 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const viewport = renderer?.getViewport?.();
    if (viewport?.length) { ctx.strokeStyle = '#fff5d9'; ctx.lineWidth = 2; ctx.beginPath(); viewport.forEach((point, index) => index ? ctx.lineTo(point.x * sx, point.y * sy) : ctx.moveTo(point.x * sx, point.y * sy)); ctx.closePath(); ctx.stroke(); }
    for (const event of state.events.filter(event => event.kind === 'alert' && state!.tick - event.tick < 30 && isVisible(event))) { ctx.strokeStyle = '#dd806a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(event.x * sx, event.y * sy, 7 + Math.sin(state.time * 5) * 3, 0, Math.PI * 2); ctx.stroke(); }
  }

  function openSkills() {
    const dialog = openModal('The civilization tree', 'skills-modal'); let skillEra = mission?.era ?? eraIndex; let zoom = 1;
    const activeAttempt = screen === 'battle' || !!savedBattle && !savedBattle.ended;
    const intro = element('div', 'skill-intro');
    append(intro, element('p', '', activeAttempt ? 'Inspect your civilization at any time. Finish or concede the active battle before purchasing knowledge or redistributing skills.' : 'Build a civilization, one decision at a time. Permanent knowledge crosses the ages; era knowledge shapes its army.'), stat('AVAILABLE KNOWLEDGE', `${campaign.points} SP`)); append(dialog, intro);
    const tools = element('div', 'skill-toolbar');
    const filters = element('select'); localAttribute(filters, 'aria-label', 'Era skill branch'); content.eras.forEach((era, index) => { const option = element('option', '', `${ROMAN[index]} · ${era.name}`); option.value = String(index); append(filters, option); }); filters.value = String(skillEra);
    const zoomOut = button('−', () => applyZoom(Math.max(0.55, zoom - 0.15)), 'small-button', 'Zoom out'); const zoomIn = button('+', () => applyZoom(Math.min(1.75, zoom + 0.15)), 'small-button', 'Zoom in');
    const respec = button('Respec · 1 SP', () => { const error = options.onRespec(); if (error) notify(error); else { notify('Knowledge refunded. Respec cost: 1 SP.'); drawTree(); } }, 'secondary'); respec.disabled = activeAttempt;
    append(tools, filters, label('DRAG TO PAN · SCROLL TO EXPLORE', 'eyebrow'), zoomOut, zoomIn, respec); append(dialog, tools);
    const scroll = element('div', 'skill-scroll'); const space = element('div', 'skill-space'); const tree = element('div', 'skill-tree'); append(space, tree); append(scroll, space); append(dialog, scroll);
    let dragging = false; let start: Vec = { x: 0, y: 0 }; let scrollStart: Vec = { x: 0, y: 0 };
    scroll.addEventListener('pointerdown', event => { if ((event.target as HTMLElement).closest('button')) return; dragging = true; start = { x: event.clientX, y: event.clientY }; scrollStart = { x: scroll.scrollLeft, y: scroll.scrollTop }; scroll.setPointerCapture(event.pointerId); scroll.classList.add('panning'); });
    scroll.addEventListener('pointermove', event => { if (!dragging) return; scroll.scrollLeft = scrollStart.x - (event.clientX - start.x); scroll.scrollTop = scrollStart.y - (event.clientY - start.y); });
    const stopDrag = () => { dragging = false; scroll.classList.remove('panning'); }; scroll.addEventListener('pointerup', stopDrag); scroll.addEventListener('pointercancel', stopDrag);
    filters.onchange = () => { skillEra = Number(filters.value); drawTree(); };
    function applyZoom(value: number) { zoom = value; tree.style.transform = `scale(${zoom})`; space.style.width = `${tree.offsetWidth * zoom}px`; space.style.height = `${tree.offsetHeight * zoom}px`; }
    function drawTree() {
      tree.replaceChildren(); const skills = content.skills.filter(skill => skill.era === null || skill.era === skillEra);
      const nodeX = (skill: SkillDef) => skill.x * 1.45;
      const maxX = Math.max(...skills.map(nodeX), 600); const maxY = Math.max(...skills.map(skill => skill.y), 420);
      const width = maxX + 260, height = maxY + 150; tree.style.width = `${width}px`; tree.style.height = `${height}px`;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height)); svg.classList.add('skill-lines');
      for (const skill of skills) for (const prerequisite of skill.prerequisites) {
        const from = skills.find(item => item.id === prerequisite); if (!from) continue;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); const ax = nodeX(from) + 110, ay = from.y + 55, bx = nodeX(skill) + 110, by = skill.y + 55;
        path.setAttribute('d', `M ${ax} ${ay} C ${ax} ${(ay + by) / 2} ${bx} ${(ay + by) / 2} ${bx} ${by}`); path.setAttribute('class', campaign.skills.includes(from.id) ? 'purchased' : ''); svg.append(path);
      } tree.append(svg);
      for (const skill of skills) {
        const bought = campaign.skills.includes(skill.id); const prerequisites = skill.prerequisites.every(id => campaign.skills.includes(id)); const eraUnlocked = skill.era === null || content.missions.some(item => item.era === skill.era && missionUnlocked(item)); const available = !bought && prerequisites && eraUnlocked && campaign.points >= skill.cost;
        const node = button('', () => showSkill(skill, drawTree), `skill-node ${bought ? 'purchased' : available ? 'available' : 'locked'}`);
        node.style.left = `${nodeX(skill)}px`; node.style.top = `${skill.y}px`;
        append(node, label(skill.era === null ? 'CIVILIZATION' : `AGE ${ROMAN[skill.era]}`, 'eyebrow'), element('strong', '', skill.name), element('span', 'skill-node-bottom', bought ? '✓ LEARNED' : `${skill.cost} SP${!prerequisites ? ' · PREREQUISITE REQUIRED' : ''}`)); append(tree, node);
      }
      const points = intro.querySelector('strong'); if (points) setText(points, `${campaign.points} SP`); applyZoom(zoom);
    }
    function showSkill(skill: SkillDef, redraw: () => void) {
      dialog.querySelector('.skill-detail')?.remove();
      const detail = element('aside', 'skill-detail'); const bought = campaign.skills.includes(skill.id); const missing = skill.prerequisites.filter(id => !campaign.skills.includes(id));
      const eraUnlocked = skill.era === null || content.missions.some(item => item.era === skill.era && missionUnlocked(item));
      const header = element('div', 'skill-detail-header'); append(header, element('h3', '', skill.name), button('×', () => detail.remove(), 'icon-button', 'Close skill details')); append(detail, header, element('p', '', skill.description));
      if (missing.length) append(detail, element('p', 'requirements', `REQUIRES: ${missing.map(id => content.skills.find(item => item.id === id)?.name ?? id).join(', ')}`));
      if (!eraUnlocked) append(detail, element('p', 'requirements', 'REACH THIS ERA TO PURCHASE ITS KNOWLEDGE.'));
      const buy = button(bought ? '✓ Knowledge acquired' : activeAttempt ? 'Finish the active battle to purchase' : `Learn · ${skill.cost} SP`, () => { const error = options.onBuySkill(skill.id); if (error) notify(error); else { redraw(); showSkill(skill, redraw); } }, 'primary');
      buy.disabled = bought || activeAttempt || missing.length > 0 || !eraUnlocked || campaign.points < skill.cost; append(detail, buy); append(dialog, detail);
    }
    drawTree();
  }
  function showResults(results: ResultsData) {
    renderer?.destroy(); renderer = null; state = null; screen = 'results'; closeModal(); root.replaceChildren(); root.classList.remove('in-battle');
    const played = content.missions.find(item => item.id === results.missionId)!; const page = element('main', 'results-page'); append(page, brand());
    const result = element('section', 'results-card'); append(result, element('div', `result-seal ${results.victory ? '' : 'defeat'}`, results.victory ? '✦' : '↶'), element('p', 'eyebrow', `${content.eras[played.era]!.name} / ${played.name}`), element('h1', '', results.victory ? 'Ground gained.' : 'A lesson from the field.'), element('p', 'result-description', results.victory ? 'The field is yours. Carry this knowledge into the next battle.' : 'Your campaign endures. Reconsider your army, your approach, and the ground you choose.'));
    const stats = element('div', 'results-stats'); append(stats, stat('PERFORMANCE SCORE', number(results.score)), stat('KNOWLEDGE EARNED', `+${results.reward} SP`), stat('PERSONAL BEST', number(campaign.records[played.id]?.bestScore ?? results.score))); append(result, stats);
    const actions = element('div', 'result-actions'); const next = nextMission();
    if (results.victory && next.id !== played.id) append(actions, button('Next battle →', () => options.onStart(next.id, false), 'primary'));
    else append(actions, button('Try this battle again →', () => options.onStart(played.id, false), 'primary'));
    append(actions, button('Campaign', renderCampaign, 'secondary'), button('Civilization tree', openSkills, 'text-button')); append(result, actions); append(page, result); append(root, page);
  }
  function onKey(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (modal && event.key === 'Tab') {
      const controls=[...modal.querySelectorAll<HTMLElement>('button:not(:disabled),input:not([hidden]),select,textarea,[tabindex="0"]')].filter(node=>node.offsetParent!==null);
      const first=controls[0],last=controls[controls.length-1];
      if(first&&last){if(event.shiftKey&&(document.activeElement===first||!modal.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!modal.contains(document.activeElement))){event.preventDefault();first.focus();}}
      return;
    }
    if (event.key === 'Escape') { if (modal) closeModal(); else if (screen === 'battle') { selection = { units: [], stronghold: null }; renderer?.setSelection(selection); productionExpanded = false; renderContext(); } return; }
    if (target.closest('input,select,textarea') || target.isContentEditable) return;
    if (modal || screen !== 'battle' || !state) return;
    if (event.code === 'Space') { event.preventDefault(); send({ type: 'pause', value: !state.paused }); return; }
    if (/^Digit[1-9]$/.test(event.code)) {
      event.preventDefault(); const index = Number(event.code.slice(-1));
      if (event.ctrlKey || event.metaKey) { groups.set(index, [...selection.units]); notify(`Control group ${index} assigned.`); }
      else if (event.shiftKey) { groups.set(index, [...new Set([...(groups.get(index) ?? []), ...selection.units])]); notify(`Selection added to group ${index}.`); }
      else { selection = { units: (groups.get(index) ?? []).filter(id => state!.units.some(unit => unit.id === id && unit.owner === 0)), stronghold: null }; renderer?.setSelection(selection); renderContext(); }
      return;
    }
    switch (event.code.startsWith('Key') ? event.code.slice(3).toLowerCase() : event.key.toLowerCase()) {
      case 's': if (selection.units.length) send({ type: 'editOrders', side: 0, ids: [...selection.units], orders: [] }); break;
      case 'h': selectHome(); break;
      case 'f': { const selected = ownUnits(); const formations = FORMATIONS.filter(formation => ['line', 'column'].includes(formation) || purchased('formations')); const next = formations[(formations.indexOf(selected[0]?.formation ?? 'line') + 1) % formations.length]!; if (selected.length) send({ type: 'formation', side: 0, ids: [...selection.units], formation: next }); break; }
      case 'q': if (selection.units.length) send({ type: 'unitAbility', side: 0, ids: [...selection.units] }); break;
      case 'r': triggerAbility('rally'); break;
      case 't': triggerAbility('recon'); break;
      case 'v': triggerAbility('volley'); break;
    }
  }
  window.addEventListener('keydown', onKey);
  renderCampaign();
  return {
    beginBattle, setState,
    setCampaign(nextCampaign: Campaign, nextSavedBattle?: BattleState | null) { campaign = nextCampaign; eraIndex = Math.min(7, Math.max(0, campaign.selectedEra)); if (nextSavedBattle !== undefined) savedBattle = nextSavedBattle; if((campaign.language??'en')!==getLanguage())applyLanguage(campaign.language??'en');if (screen === 'campaign') { if (modal) campaignDirty = true; else renderCampaign(); } },
    showResults, showCampaign: renderCampaign, notify,
    destroy() { destroyed = true; renderer?.destroy(); closeModal(); window.removeEventListener('keydown', onKey); root.remove(); toasts.remove(); },
  };
}
