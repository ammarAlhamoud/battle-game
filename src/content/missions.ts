import type { MissionDef, Role, StrongholdConfig, Terrain } from '../contracts.js';

/** A paint is an authored rectangular terrain stroke, never a random placement. */
type Paint = [tile: Terrain, x: number, y: number, width: number, height: number];
type Site = [name: string, x: number, y: number, kind?: 'outpost' | 'watchtower' | 'gate', owner?: 0 | 1 | null];
interface Scenario {
  name: string; subtitle: string; briefing: string; concept: string;
  paint: Paint[]; sites: Site[]; budget: number; capacity: number; reserve: number;
  army: Role[]; roster: Role[]; ai: [number, number, number, number]; preferred: Role[];
  par: number; thresholds: number[]; tutorial?: string;
}
const B: Role[] = ['frontline', 'ranged', 'guard', 'scout'];
const S: Role[] = [...B, 'stealth'];
const R: Role[] = [...S, 'siege'];
const A: Role[] = [...R, 'engineer'];
const G: Role[] = [...B, 'siege', 'engineer'];

/** Forty complete authored tactical plans. No seed or difficulty transform produces a map. */
const plans: Scenario[][] = [
  [
    {
      name: 'The First Gathering', subtitle: 'Clearings & flanking trails',
      briefing: 'Take the River stones to expand your army, scout the wooded center, then approach the rival hearth from the east. The open eastern trail lets a small force avoid the central defenders.',
      concept: 'A woodland center separates a short sheltered approach from a long exposed eastern flank. Early capture buys a second group rather than a compulsory frontal fight.',
      paint: [['f', 9, 7, 6, 8], ['f', 16, 12, 3, 5], ['f', 3, 4, 4, 3], ['^', 19, 7, 5, 3], ['^', 5, 14, 3, 2], ['c', 8, 16, 3, 2], ['c', 17, 5, 3, 2], ['~', 1, 9, 3, 3], ['#', 11, 2, 4, 2]],
      sites: [['River stones', 8, 16], ['The old oak', 13, 10, 'watchtower'], ['High meadow', 20, 8]],
      budget: 480, capacity: 16, reserve: 4, army: ['frontline', 'frontline', 'ranged', 'scout'], roster: B,
      ai: [.42, .65, .5, .6], preferred: ['frontline', 'ranged', 'scout'], par: 280, thresholds: [300, 700, 1150],
      tutorial: 'Select soldiers with a click or drag. Right-click ground to move. Select River stones and right-click it with soldiers selected to capture. Press Space to plan while paused.',
    },
    {
      name: 'Reed Crossing', subtitle: 'Two bridges, unequal approaches',
      briefing: 'The broad river can be crossed at the sheltered western ford or the exposed eastern bridge. Claim the southern lookout before committing your hunters to either crossing.',
      concept: 'A two-cell river forces deliberate bridge choice: the west route is short but wooded, the east is wide enough for a line and visible from a neutral hill.',
      paint: [['~', 0, 11, 28, 2], ['=', 6, 11, 2, 2], ['=', 19, 11, 3, 2], ['f', 3, 7, 5, 3], ['f', 8, 14, 4, 5], ['f', 14, 3, 4, 4], ['^', 20, 8, 5, 2], ['^', 14, 16, 5, 3], ['c', 4, 14, 4, 2], ['c', 17, 7, 3, 2]],
      sites: [['Reed lookout', 8, 16, 'watchtower'], ['West ford camp', 6, 8], ['Eastern bank', 21, 9]],
      budget: 520, capacity: 17, reserve: 4, army: ['frontline', 'frontline', 'ranged', 'ranged', 'scout'], roster: S,
      ai: [.48, .65, .57, .8], preferred: ['guard', 'ranged', 'scout'], par: 320, thresholds: [350, 800, 1300],
      tutorial: 'Scouts see farther and detect concealed units. Bridges compress wide formations: a column crosses safely, then a line can reform on the far bank.',
    },
    {
      name: 'Split Ridge', subtitle: 'Gates in the stone',
      briefing: 'A stone ridge divides the valley. Hold the lower passage with wardens while runners investigate the upper trail. Taking the central gate opens a protected staging position.',
      concept: 'A tall central ridge has two narrow gates and a long northern bypass. A guarding force can hold one gate while scouts expose the other route.',
      paint: [['#', 12, 4, 2, 17], ['g', 12, 9, 2, 2], ['g', 12, 17, 2, 2], ['^', 8, 7, 3, 4], ['^', 15, 14, 4, 4], ['f', 3, 10, 4, 5], ['f', 17, 4, 4, 3], ['f', 20, 13, 4, 5], ['c', 9, 17, 3, 3], ['c', 15, 8, 3, 2], ['~', 1, 2, 5, 2]],
      sites: [['Lower stone gate', 12, 18, 'gate'], ['Ridge-eye', 16, 9, 'watchtower'], ['Northern trail', 10, 3]],
      budget: 550, capacity: 18, reserve: 5, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: S,
      ai: [.38, .52, .82, .75], preferred: ['guard', 'frontline', 'ranged'], par: 350, thresholds: [400, 850, 1400],
      tutorial: 'Hold Shift while right-clicking to append orders. While paused, inspect and edit each selected unit’s queue. Defending soldiers resist capture.',
    },
    {
      name: 'The Hidden Hearth', subtitle: 'Scouting before commitment',
      briefing: 'The central grove hides several approaches. Capture the firebreak lookout to reveal the eastern route, then keep scouts with your hunters to expose reed stalkers.',
      concept: 'A broad, broken woodland favors ambushers, but two clear firebreaks and an offset lookout reward active detection instead of blindly marching through cover.',
      paint: [['f', 6, 6, 16, 11], ['.', 6, 10, 16, 2], ['.', 13, 6, 2, 11], ['^', 9, 4, 5, 2], ['^', 21, 10, 4, 4], ['~', 2, 7, 3, 4], ['~', 18, 18, 5, 3], ['c', 7, 16, 4, 2], ['c', 17, 7, 4, 2], ['#', 9, 19, 4, 2]],
      sites: [['South firebreak', 9, 16], ['Firebreak lookout', 14, 10, 'watchtower'], ['East grove', 21, 8], ['Upper clearing', 10, 4]],
      budget: 570, capacity: 18, reserve: 5, army: ['frontline', 'ranged', 'ranged', 'guard', 'scout', 'scout'], roster: S,
      ai: [.57, .68, .42, .9], preferred: ['stealth', 'scout', 'ranged'], par: 370, thresholds: [450, 950, 1500],
      tutorial: 'Concealed fighters remain hidden outside detection range. A watchtower extends vision, while a scout must still approach to reveal nearby stealth units.',
    },
    {
      name: 'Last Ember', subtitle: 'Era finale · The forked river',
      briefing: 'The river splits into three fronts. Secure the western camp, use the island beacon to read the enemy movement, then cross together. A lone group on either bridge can be surrounded.',
      concept: 'A T-shaped river creates three sectors, three crossings and a central beacon. Occupying the island exposes both final approaches, while the northern ford remains a viable flank.',
      paint: [['~', 12, 0, 2, 18], ['~', 12, 12, 16, 2], ['=', 12, 6, 2, 2], ['=', 12, 16, 2, 2], ['=', 20, 12, 3, 2], ['f', 7, 6, 4, 5], ['f', 16, 3, 4, 4], ['f', 18, 16, 6, 3], ['^', 6, 13, 4, 3], ['^', 15, 8, 4, 3], ['c', 9, 17, 3, 2], ['c', 19, 9, 4, 2], ['#', 23, 18, 3, 3]],
      sites: [['Western hearth', 8, 15], ['Island beacon', 16, 10, 'watchtower'], ['Northern ford', 11, 7, 'gate'], ['South bank camp', 20, 16]],
      budget: 640, capacity: 20, reserve: 6, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: S,
      ai: [.66, .78, .65, .85], preferred: ['frontline', 'stealth', 'scout'], par: 420, thresholds: [500, 1100, 1750],
    },
  ],
  [
    {
      name: 'Canals of Clay', subtitle: 'Offset crossings',
      briefing: 'Two irrigation canals divide the plain. Their bridges do not align: take the market as a staging ground rather than feeding soldiers through both crossings without support.',
      concept: 'Parallel canals with staggered bridges force an S-shaped advance. A central market is both a capacity prize and a safe place to reform.',
      paint: [['~', 9, 0, 2, 24], ['~', 18, 0, 2, 24], ['=', 9, 16, 2, 3], ['=', 9, 5, 2, 2], ['=', 18, 7, 2, 3], ['=', 18, 19, 2, 2], ['f', 3, 6, 4, 4], ['f', 21, 14, 4, 4], ['^', 12, 5, 4, 3], ['c', 12, 13, 4, 4], ['g', 13, 10, 3, 1]],
      sites: [['Clay market', 14, 15], ['Canal shrine', 13, 7, 'watchtower'], ['Eastern granary', 22, 13]],
      budget: 620, capacity: 19, reserve: 5, army: ['frontline', 'frontline', 'ranged', 'guard', 'scout'], roster: B,
      ai: [.42, .75, .62, .65], preferred: ['guard', 'frontline', 'ranged'], par: 360, thresholds: [400, 900, 1450],
      tutorial: 'A new era replaces the recruitment roster. Persistent skills remain; era-specific skills affect only their own era. The main stronghold is your only recruitment center.',
    },
    {
      name: 'Salt Road', subtitle: 'Mobility against the shield wall',
      briefing: 'The salt road is exposed, while broken hills and acacia groves shelter both flanks. Use chariots to seize the roadside posts before slow shield formations arrive.',
      concept: 'An unobstructed central road favors ranged concentration, but separated flank objectives make a single slow shield ball surrender map control.',
      paint: [['c', 2, 11, 24, 2], ['^', 5, 5, 5, 4], ['^', 17, 15, 6, 4], ['f', 8, 15, 5, 5], ['f', 17, 4, 4, 4], ['#', 12, 5, 3, 3], ['#', 11, 17, 3, 3], ['~', 23, 10, 3, 4], ['g', 14, 11, 1, 2]],
      sites: [['West salt house', 8, 12], ['Acacia well', 14, 6, 'watchtower'], ['Caravan depot', 19, 17]],
      budget: 650, capacity: 20, reserve: 5, army: ['frontline', 'frontline', 'ranged', 'scout', 'scout'], roster: R,
      ai: [.72, .82, .32, .9], preferred: ['scout', 'ranged', 'frontline'], par: 340, thresholds: [450, 950, 1500],
    },
    {
      name: 'Three Riverbanks', subtitle: 'Hold, cross, reform',
      briefing: 'Two wide channels create a contested middle bank. Taking the central sanctuary expands your force, but an eastern bridge offers a route around its defenders.',
      concept: 'Two horizontal rivers with asymmetric crossings create three bands. The middle sanctuary is valuable but can be bypassed via a long eastern route.',
      paint: [['~', 0, 8, 28, 2], ['~', 0, 15, 28, 2], ['=', 5, 15, 3, 2], ['=', 21, 15, 2, 2], ['=', 12, 8, 3, 2], ['=', 22, 8, 2, 2], ['f', 9, 18, 6, 3], ['f', 4, 3, 6, 3], ['^', 16, 11, 5, 3], ['c', 7, 11, 5, 3], ['c', 18, 4, 3, 2]],
      sites: [['Lower landing', 8, 18], ['Central sanctuary', 12, 12], ['River observatory', 19, 12, 'watchtower'], ['Upper landing', 18, 6]],
      budget: 680, capacity: 21, reserve: 6, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: R,
      ai: [.5, .8, .75, .75], preferred: ['guard', 'siege', 'ranged'], par: 420, thresholds: [500, 1050, 1650],
    },
    {
      name: 'The Copper Gate', subtitle: 'Assault or encirclement',
      briefing: 'Two fortification lines protect the copper works. A covered ram can lead the main gate assault, or your scouts can claim the northern gatehouse and open a wider flank.',
      concept: 'Two offset defensive walls form a layered assault puzzle. The lower gate is wide enough for a ram, while a longer northern gap rewards mobile forces.',
      paint: [['#', 11, 4, 2, 18], ['g', 11, 15, 2, 3], ['g', 11, 6, 2, 2], ['#', 18, 2, 2, 16], ['g', 18, 7, 2, 3], ['g', 18, 15, 2, 2], ['^', 14, 9, 3, 4], ['f', 5, 7, 4, 4], ['f', 21, 12, 4, 6], ['c', 7, 16, 4, 3], ['c', 21, 7, 3, 3]],
      sites: [['Copper works', 15, 16], ['North gatehouse', 11, 7, 'gate'], ['Wall sentinel', 21, 10, 'watchtower']],
      budget: 710, capacity: 22, reserve: 6, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: R,
      ai: [.35, .55, .95, .7], preferred: ['guard', 'ranged', 'siege'], par: 440, thresholds: [500, 1100, 1750],
    },
    {
      name: 'The Flood Crown', subtitle: 'Era finale · A city behind water',
      briefing: 'The royal district sits behind a canal. Capture the sluice camp and southern shrine to support a coordinated assault through either city bridge. Avoid bunching your whole army at one entrance.',
      concept: 'A moated northeastern city has west and south bridge entrances, outside observation hills and a distant resource flank. The defender must choose which bridge to cover.',
      paint: [['~', 17, 0, 2, 12], ['~', 17, 11, 11, 2], ['=', 17, 5, 2, 3], ['=', 23, 11, 3, 2], ['#', 20, 8, 5, 1], ['g', 22, 8, 2, 1], ['f', 6, 5, 5, 5], ['f', 14, 16, 4, 5], ['^', 12, 5, 4, 3], ['^', 21, 15, 4, 3], ['c', 8, 15, 5, 3], ['c', 20, 3, 3, 3]],
      sites: [['Sluice camp', 14, 7, 'gate'], ['Southern shrine', 20, 16], ['Flood beacon', 13, 12, 'watchtower'], ['City approach', 23, 14]],
      budget: 790, capacity: 24, reserve: 7, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: R,
      ai: [.63, .7, .87, .8], preferred: ['guard', 'siege', 'ranged'], par: 480, thresholds: [600, 1250, 1950],
    },
  ],
  [
    {
      name: 'The Broken Forum', subtitle: 'Crossroads of the republic',
      briefing: 'The forum roads connect three valuable positions. Legionaries can hold the central square, while auxiliary cavalry exploit the clear outer streets to cut off reinforcements.',
      concept: 'Crossed roads through four unequal terrain quadrants reward splitting the army. The square controls direct travel, but all outer streets remain open.',
      paint: [['c', 3, 11, 22, 2], ['c', 13, 3, 2, 18], ['#', 8, 7, 3, 3], ['#', 17, 14, 3, 3], ['f', 4, 4, 3, 5], ['f', 20, 15, 5, 5], ['^', 17, 5, 5, 4], ['^', 6, 14, 5, 4], ['~', 1, 12, 3, 3]],
      sites: [['Forum square', 14, 12], ['Senate steps', 19, 8, 'watchtower'], ['Western colonnade', 8, 16]],
      budget: 690, capacity: 21, reserve: 6, army: ['frontline', 'frontline', 'ranged', 'guard', 'scout'], roster: B,
      ai: [.58, .7, .6, .7], preferred: ['frontline', 'scout', 'ranged'], par: 350, thresholds: [450, 950, 1500],
    },
    {
      name: 'Beneath the Aqueduct', subtitle: 'A valley with three doors',
      briefing: 'The ruined aqueduct constricts the valley. Its three archways favor different forces: a broad southern arch for cohorts, a narrow central route, and an open northern cavalry flank.',
      concept: 'A horizontal escarpment with three differently sized archways rewards group-specific paths and reformation beyond the choke rather than repeated frontal congestion.',
      paint: [['#', 2, 10, 24, 2], ['g', 5, 10, 4, 2], ['g', 14, 10, 1, 2], ['g', 21, 10, 3, 2], ['^', 10, 5, 6, 3], ['^', 16, 15, 5, 4], ['f', 3, 5, 5, 4], ['f', 8, 16, 5, 4], ['c', 5, 13, 4, 3], ['c', 20, 6, 4, 3], ['~', 1, 15, 2, 4]],
      sites: [['South arch station', 7, 14, 'gate'], ['Aqueduct beacon', 15, 7, 'watchtower'], ['East arch station', 22, 8, 'gate']],
      budget: 720, capacity: 22, reserve: 6, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout', 'scout'], roster: A,
      ai: [.45, .72, .8, .8], preferred: ['guard', 'scout', 'ranged'], par: 380, thresholds: [500, 1050, 1650],
      tutorial: 'Engineer skills unlock construction. Select an engineer and build a barrier or sensor tower on visible open ground. Construction consumes finite battle resources.',
    },
    {
      name: 'Three Standards', subtitle: 'An exposed center, protected wings',
      briefing: 'Three standards stretch across the valley. The central banner is fast to reach but exposed to hill fire; the forest and quarry banners support slower, safer flanking attacks.',
      concept: 'Three separated objectives support simultaneous fronts. The central one is exposed, the west is wooded and the east sits behind a quarry mouth.',
      paint: [['^', 10, 7, 7, 3], ['^', 9, 15, 7, 3], ['f', 4, 7, 5, 9], ['#', 19, 9, 2, 7], ['#', 21, 14, 4, 2], ['g', 19, 11, 2, 2], ['c', 11, 11, 6, 2], ['c', 21, 8, 3, 3], ['~', 2, 3, 4, 2], ['f', 21, 18, 3, 3]],
      sites: [['Forest standard', 7, 12], ['Central standard', 14, 12], ['Quarry standard', 22, 11], ['Quarry eye', 22, 7, 'watchtower']],
      budget: 750, capacity: 23, reserve: 7, army: ['frontline', 'frontline', 'frontline', 'ranged', 'ranged', 'scout'], roster: A,
      ai: [.68, .9, .4, .75], preferred: ['scout', 'frontline', 'stealth'], par: 380, thresholds: [550, 1100, 1750],
    },
    {
      name: 'The Harbor Road', subtitle: 'A peninsula under observation',
      briefing: 'The harbor water compresses the eastern approach. The long western road avoids the exposed coastal gate; control the lighthouse to know when the enemy changes routes.',
      concept: 'An L-shaped coastline removes the southern/eastern shortcut. A narrow coastal causeway is quick but observed; a wide inland arc favors mobile cohorts.',
      paint: [['~', 16, 15, 12, 9], ['~', 23, 7, 5, 8], ['=', 23, 10, 3, 2], ['#', 16, 9, 2, 6], ['g', 16, 12, 2, 2], ['f', 5, 6, 5, 5], ['f', 11, 17, 4, 4], ['^', 11, 5, 5, 3], ['^', 19, 9, 3, 4], ['c', 8, 12, 5, 2], ['c', 19, 4, 3, 3]],
      sites: [['Inland depot', 10, 13], ['Lighthouse hill', 21, 11, 'watchtower'], ['Coastal gate', 17, 13, 'gate']],
      budget: 780, capacity: 24, reserve: 7, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: A,
      ai: [.5, .66, .85, .82], preferred: ['ranged', 'siege', 'guard'], par: 430, thresholds: [550, 1200, 1850],
    },
    {
      name: 'The Eagle Pass', subtitle: 'Era finale · Defense in depth',
      briefing: 'Two broken ridges guard the pass. Establish an engineer-supported staging ground between them, or send cavalry around the far northern opening while the main army fixes the southern gate.',
      concept: 'Offset vertical cliff layers create a defended middle pocket. Both gates have bypasses, so artillery pressure and a northern cavalry thrust are viable alternatives.',
      paint: [['#', 9, 4, 2, 18], ['g', 9, 15, 2, 3], ['g', 9, 6, 2, 2], ['#', 17, 1, 2, 18], ['g', 17, 7, 2, 3], ['g', 17, 16, 2, 2], ['^', 12, 8, 4, 3], ['^', 20, 12, 5, 3], ['f', 3, 5, 4, 5], ['f', 12, 17, 4, 4], ['c', 12, 12, 4, 3], ['c', 20, 6, 4, 3], ['~', 23, 17, 3, 4]],
      sites: [['Lower legion camp', 7, 15], ['Pass sanctuary', 14, 13], ['Eagle watch', 21, 9, 'watchtower'], ['Northern gate', 18, 8, 'gate']],
      budget: 850, capacity: 26, reserve: 8, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout', 'scout'], roster: A,
      ai: [.65, .72, .9, .86], preferred: ['guard', 'siege', 'frontline'], par: 490, thresholds: [650, 1350, 2100],
    },
  ],
  [
    {
      name: 'Arrows over Heather', subtitle: 'The high ground is never free',
      briefing: 'Longbows command the center from two hills. Claim the lowland farm to support an advance, then use the wooded western slope to close on exposed archers.',
      concept: 'Two offset bow hills overlook an open diagonal valley. Woodland cover and an undefended eastern margin provide alternatives to climbing directly under fire.',
      paint: [['^', 9, 7, 5, 4], ['^', 16, 13, 5, 4], ['f', 5, 7, 3, 9], ['f', 19, 5, 4, 3], ['c', 8, 16, 5, 2], ['c', 17, 10, 4, 2], ['~', 1, 5, 3, 4], ['#', 23, 16, 3, 4]],
      sites: [['Heather farm', 10, 17], ['West bow hill', 11, 9, 'watchtower'], ['East bow hill', 18, 14]],
      budget: 740, capacity: 22, reserve: 6, army: ['frontline', 'frontline', 'ranged', 'ranged', 'scout'], roster: B,
      ai: [.5, .65, .75, .65], preferred: ['ranged', 'frontline', 'guard'], par: 370, thresholds: [500, 1000, 1600],
    },
    {
      name: 'Two Bridges of Alder', subtitle: 'Crossfire between the channels',
      briefing: 'The Alder divides around a narrow middle bank. A wide western bridge supports shield formations, while the eastern route reaches the rear of the upper defenders.',
      concept: 'Two narrow horizontal waterways have offset paired bridges. The island outpost is exposed from both banks and is best taken with synchronized supporting forces.',
      paint: [['~', 0, 9, 28, 2], ['~', 0, 14, 28, 2], ['=', 6, 14, 4, 2], ['=', 19, 14, 2, 2], ['=', 10, 9, 2, 2], ['=', 21, 9, 3, 2], ['f', 11, 17, 5, 4], ['f', 3, 3, 6, 4], ['^', 16, 4, 4, 4], ['c', 8, 11, 4, 3], ['c', 20, 11, 4, 3]],
      sites: [['Lower bridge camp', 8, 17], ['Island tollhouse', 14, 12], ['Alder beacon', 20, 7, 'watchtower']],
      budget: 780, capacity: 23, reserve: 7, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: A,
      ai: [.48, .75, .8, .8], preferred: ['guard', 'ranged', 'scout'], par: 410, thresholds: [550, 1100, 1750],
    },
    {
      name: 'The Greenwood Oath', subtitle: 'A siege sheltered by trees',
      briefing: 'The forest breaks into narrow clearings around an old wall. Use scouts to prevent an ambush, then bring siege support through the central firebreak or take the exposed eastern road.',
      concept: 'Three woodland bands channel units into parallel lanes; a broken cross-wall links those lanes at two gates. Sightline control matters more than numerical concentration.',
      paint: [['f', 6, 4, 3, 15], ['f', 12, 6, 3, 15], ['f', 19, 3, 3, 14], ['#', 8, 11, 13, 1], ['g', 9, 11, 3, 1], ['g', 15, 11, 4, 1], ['^', 23, 9, 3, 5], ['^', 8, 20, 5, 2], ['c', 15, 14, 3, 3], ['c', 9, 6, 3, 3], ['~', 2, 5, 2, 4]],
      sites: [['Forester lodge', 10, 17], ['Old wall gate', 16, 11, 'gate'], ['Greenwood lookout', 17, 6, 'watchtower'], ['East road toll', 24, 13]],
      budget: 810, capacity: 24, reserve: 7, army: ['frontline', 'frontline', 'ranged', 'guard', 'scout', 'scout'], roster: A,
      ai: [.68, .75, .56, .92], preferred: ['stealth', 'scout', 'ranged'], par: 430, thresholds: [600, 1200, 1850],
    },
    {
      name: 'Between Two Keeps', subtitle: 'A choice of defended gates',
      briefing: 'A fortified wall divides two keeps. Claim a gatehouse to stage an assault, or capture both outside watchtowers so the enemy cannot shift its reserves unseen.',
      concept: 'A full-height central curtain wall has three gates: two contestable gatehouses and a narrow center. Outer watchtowers make defender rotations legible.',
      paint: [['#', 14, 0, 2, 24], ['g', 14, 5, 2, 3], ['g', 14, 12, 2, 1], ['g', 14, 18, 2, 3], ['^', 9, 4, 4, 5], ['^', 18, 15, 4, 5], ['f', 5, 10, 4, 5], ['f', 19, 6, 4, 5], ['c', 10, 16, 3, 4], ['c', 17, 4, 4, 3], ['~', 22, 19, 4, 3]],
      sites: [['South gatehouse', 14, 19, 'gate'], ['North gatehouse', 15, 6, 'gate'], ['West watch', 10, 7, 'watchtower'], ['East watch', 20, 17, 'watchtower']],
      budget: 840, capacity: 25, reserve: 8, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: A,
      ai: [.4, .65, .97, .8], preferred: ['guard', 'siege', 'ranged'], par: 450, thresholds: [600, 1250, 1950],
    },
    {
      name: 'The Last Crown', subtitle: 'Era finale · The moated citadel',
      briefing: 'The crown citadel has two entrances across its moat. Use the abbey as a protected muster ground; siege cover and a mobile feint can keep both gates under pressure.',
      concept: 'The northeast citadel combines a moat with an inner curtain wall. Two separate bridge-and-gate entries permit a coordinated split assault; the abbey supplies the outside staging area.',
      paint: [['~', 16, 0, 2, 13], ['~', 16, 12, 12, 2], ['=', 16, 5, 2, 3], ['=', 22, 12, 3, 2], ['#', 19, 1, 1, 9], ['#', 19, 9, 8, 1], ['g', 19, 5, 1, 2], ['g', 23, 9, 2, 1], ['f', 6, 5, 5, 6], ['f', 11, 16, 5, 5], ['^', 12, 7, 3, 4], ['^', 20, 16, 5, 3], ['c', 7, 13, 6, 3], ['c', 20, 3, 4, 3]],
      sites: [['Abbey field', 10, 14], ['Moat sentinel', 14, 8, 'watchtower'], ['South siege ground', 22, 16], ['Crown gate', 23, 10, 'gate']],
      budget: 930, capacity: 28, reserve: 8, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout', 'scout'], roster: A,
      ai: [.65, .72, .95, .88], preferred: ['guard', 'siege', 'ranged'], par: 520, thresholds: [700, 1400, 2200],
    },
  ],
  [
    {
      name: 'The Powder Road', subtitle: 'Pikes before the smoke',
      briefing: 'An open road exposes reloading musketeers. Advance pikes between the roadside cover, use dragoons to watch the flanks, and avoid a single dense firing line.',
      concept: 'A broad diagonal firing corridor is broken by cover islands. Pike screens can leapfrog between positions while dragoon patrols exploit the outer trees.',
      paint: [['c', 6, 16, 4, 2], ['c', 11, 12, 4, 2], ['c', 17, 8, 4, 2], ['f', 6, 5, 4, 6], ['f', 18, 14, 5, 6], ['^', 11, 5, 5, 3], ['^', 8, 18, 5, 3], ['#', 22, 10, 3, 3], ['~', 2, 8, 2, 4]],
      sites: [['Powder store', 8, 16], ['Road battery', 15, 12], ['Signal hill', 18, 7, 'watchtower']],
      budget: 790, capacity: 23, reserve: 7, army: ['frontline', 'frontline', 'ranged', 'ranged', 'scout'], roster: B,
      ai: [.6, .7, .62, .72], preferred: ['frontline', 'ranged', 'scout'], par: 370, thresholds: [500, 1050, 1650],
    },
    {
      name: 'The Marsh Battery', subtitle: 'Artillery with a vulnerable flank',
      briefing: 'The marsh offers three dry routes around isolated pools. A central cannon position controls the shortest approach but cannot cover both winding flank roads at once.',
      concept: 'Staggered marsh pools create three winding land corridors rather than a single bridge choke. A central hill has strong reach and poor escape options.',
      paint: [['~', 6, 9, 4, 6], ['~', 13, 3, 4, 5], ['~', 15, 15, 5, 6], ['~', 22, 9, 4, 4], ['=', 8, 11, 2, 2], ['^', 12, 10, 5, 4], ['f', 3, 5, 4, 3], ['f', 18, 6, 3, 5], ['f', 8, 17, 5, 3], ['c', 10, 8, 3, 2], ['c', 19, 13, 3, 3]],
      sites: [['Dry island battery', 14, 12], ['Marsh survey', 10, 17, 'watchtower'], ['Eastern causeway', 20, 14]],
      budget: 830, capacity: 24, reserve: 7, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: G,
      ai: [.46, .68, .88, .86], preferred: ['siege', 'guard', 'ranged'], par: 410, thresholds: [550, 1150, 1800],
    },
    {
      name: 'Across the Gunline', subtitle: 'A crossing under observation',
      briefing: 'The northern heights overlook both river crossings. Dragoons can seize the west observation post while pikes protect the main force crossing beneath the eastern gunline.',
      concept: 'A river separates lowland deployment from northern firing hills. The western bridge avoids direct hill fire but adds distance; the eastern bridge offers speed with exposure.',
      paint: [['~', 0, 12, 28, 2], ['=', 5, 12, 3, 2], ['=', 20, 12, 3, 2], ['^', 14, 6, 7, 4], ['^', 8, 16, 6, 3], ['f', 3, 6, 4, 5], ['f', 18, 16, 5, 5], ['c', 9, 9, 4, 2], ['c', 19, 10, 5, 2], ['#', 10, 4, 2, 3], ['g', 10, 6, 2, 1]],
      sites: [['Lower redoubt', 10, 17], ['West observation', 6, 9, 'watchtower'], ['Northern battery', 18, 8], ['Eastern landing', 22, 10]],
      budget: 860, capacity: 25, reserve: 8, army: ['frontline', 'frontline', 'ranged', 'ranged', 'scout', 'scout'], roster: G,
      ai: [.58, .78, .82, .85], preferred: ['ranged', 'siege', 'frontline'], par: 430, thresholds: [600, 1250, 1950],
    },
    {
      name: 'The Starward Fort', subtitle: 'Angles and reload windows',
      briefing: 'The fort’s angled earthworks create overlapping firing positions. Claim a forward redoubt, spread out before cannon fire, and approach the western or southern gate with support.',
      concept: 'Staggered bastions protect a northeastern enclosure while leaving two wide assault gates. Nearby outside cover allows disciplined advances and counterbattery positioning.',
      paint: [['#', 16, 1, 2, 10], ['#', 18, 10, 9, 2], ['#', 14, 8, 2, 3], ['#', 20, 12, 3, 2], ['g', 16, 5, 2, 3], ['g', 23, 10, 3, 2], ['c', 10, 7, 4, 3], ['c', 17, 14, 4, 3], ['^', 8, 13, 5, 3], ['f', 4, 5, 4, 5], ['f', 10, 19, 5, 3], ['~', 24, 16, 3, 5]],
      sites: [['Forward redoubt', 12, 9], ['Southern earthwork', 19, 15], ['Bastion signal', 15, 13, 'watchtower']],
      budget: 900, capacity: 26, reserve: 8, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: G,
      ai: [.38, .6, .98, .78], preferred: ['guard', 'siege', 'ranged'], par: 470, thresholds: [650, 1300, 2050],
    },
    {
      name: 'A Republic of Smoke', subtitle: 'Era finale · Three firing fronts',
      briefing: 'A broken river cuts across a battlefield of cover and hills. Take the magazines on opposite wings, then coordinate your final crossing. Concentrating every soldier in the central smoke lane invites cannon fire.',
      concept: 'A stepped river and three crossings divide a chain of covered firing positions. Widely separated magazines reward simultaneous groups and deny a single perfect artillery position.',
      paint: [['~', 0, 10, 11, 2], ['~', 10, 10, 2, 6], ['~', 10, 15, 18, 2], ['=', 5, 10, 3, 2], ['=', 10, 12, 2, 2], ['=', 21, 15, 3, 2], ['c', 5, 14, 4, 2], ['c', 12, 11, 4, 2], ['c', 17, 7, 4, 2], ['c', 18, 18, 4, 2], ['^', 13, 4, 4, 3], ['^', 15, 18, 3, 3], ['f', 3, 5, 4, 4], ['f', 23, 8, 3, 5], ['#', 7, 19, 3, 2]],
      sites: [['West magazine', 7, 14], ['Republic signal', 15, 10, 'watchtower'], ['East magazine', 21, 18], ['Northern redoubt', 19, 7]],
      budget: 980, capacity: 28, reserve: 9, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout', 'scout'], roster: G,
      ai: [.72, .8, .84, .9], preferred: ['siege', 'ranged', 'frontline'], par: 510, thresholds: [750, 1500, 2300],
    },
  ],
  [
    {
      name: 'Iron Junction', subtitle: 'The railway crossroads',
      briefing: 'The junction connects long open lanes. Capture the signal box and use the embankments for cover; a wide flank through the park avoids the exposed central rails.',
      concept: 'A cover-marked rail cross links four open corridors, with short embankment walls preventing direct diagonal shortcuts. The center is fast but exposed from multiple directions.',
      paint: [['c', 3, 12, 22, 2], ['c', 13, 3, 2, 18], ['#', 8, 8, 4, 2], ['#', 17, 15, 4, 2], ['#', 8, 15, 2, 3], ['f', 3, 5, 4, 5], ['f', 19, 17, 5, 4], ['^', 17, 5, 5, 4], ['~', 23, 10, 3, 4]],
      sites: [['Signal box', 14, 13, 'watchtower'], ['West freight yard', 8, 13], ['North depot', 17, 6]],
      budget: 850, capacity: 24, reserve: 7, army: ['frontline', 'frontline', 'ranged', 'scout', 'scout'], roster: B,
      ai: [.62, .76, .6, .85], preferred: ['frontline', 'ranged', 'scout'], par: 360, thresholds: [550, 1100, 1750],
    },
    {
      name: 'The Furnace Line', subtitle: 'Cover between the foundries',
      briefing: 'Factory blocks hide short flanking streets between open yards. Engineers can fortify an approach, but committing too much to the central furnace leaves both outside routes open.',
      concept: 'Four staggered factory obstacles produce an urban weaving route with two long outside alleys. Corner cover supports infantry while artillery must choose its sightline.',
      paint: [['#', 7, 7, 4, 4], ['#', 14, 5, 4, 4], ['#', 11, 14, 4, 4], ['#', 20, 11, 4, 5], ['c', 7, 12, 4, 2], ['c', 15, 10, 4, 2], ['c', 16, 16, 3, 3], ['g', 12, 11, 2, 2], ['f', 3, 4, 3, 5], ['f', 20, 18, 4, 3], ['^', 10, 3, 3, 2], ['~', 2, 11, 2, 4]],
      sites: [['Central furnace', 14, 12], ['Boiler yard', 8, 15], ['Roof observatory', 19, 9, 'watchtower']],
      budget: 890, capacity: 25, reserve: 8, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: G,
      ai: [.54, .7, .82, .78], preferred: ['engineer', 'frontline', 'guard'], par: 400, thresholds: [600, 1200, 1850],
    },
    {
      name: 'The Mountain Railway', subtitle: 'A cut through the escarpment',
      briefing: 'The railway cut winds between three cliffs. Scouts can cross the upper trail while rifle sections advance along the cut. Hold the semaphore hill before moving howitzers forward.',
      concept: 'Three step-shaped cliff segments produce a winding diagonal corridor with separate outer bypasses. Capture points sit at turns rather than at a single central choke.',
      paint: [['#', 7, 5, 3, 9], ['#', 10, 5, 5, 3], ['#', 13, 12, 3, 9], ['#', 16, 16, 5, 3], ['#', 20, 6, 3, 7], ['g', 7, 10, 3, 2], ['c', 10, 10, 3, 6], ['c', 16, 10, 4, 3], ['^', 15, 4, 4, 4], ['f', 3, 6, 3, 6], ['f', 21, 18, 4, 3], ['~', 1, 14, 3, 3]],
      sites: [['Lower cut station', 10, 15], ['Semaphore hill', 17, 6, 'watchtower'], ['Upper cut station', 18, 11], ['Old mountain gate', 8, 11, 'gate']],
      budget: 920, capacity: 26, reserve: 8, army: ['frontline', 'frontline', 'ranged', 'ranged', 'scout', 'scout'], roster: G,
      ai: [.58, .78, .78, .9], preferred: ['scout', 'ranged', 'siege'], par: 440, thresholds: [650, 1300, 2050],
    },
    {
      name: 'Wire and Earth', subtitle: 'Entrenchments with open wings',
      briefing: 'Broken entrenchments protect the center. Spread your rifle sections, use engineers to hold captured ground, and send scouts around either end before committing to a narrow breach.',
      concept: 'Two broken horizontal trench walls have deliberately misaligned openings. Open map edges remain viable flanks, trading distance for avoidance of the prepared center.',
      paint: [['#', 4, 9, 20, 1], ['g', 8, 9, 3, 1], ['g', 19, 9, 2, 1], ['#', 5, 15, 19, 1], ['g', 6, 15, 2, 1], ['g', 15, 15, 3, 1], ['c', 5, 10, 18, 2], ['c', 6, 16, 17, 2], ['^', 13, 4, 6, 3], ['f', 1, 6, 3, 8], ['f', 24, 11, 3, 8], ['~', 10, 19, 4, 3]],
      sites: [['Lower trench camp', 10, 17], ['Central dugout', 14, 12], ['Artillery observation', 16, 6, 'watchtower']],
      budget: 950, capacity: 27, reserve: 9, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: G,
      ai: [.4, .62, .98, .8], preferred: ['guard', 'engineer', 'siege'], par: 460, thresholds: [650, 1350, 2100],
    },
    {
      name: 'The Foundry Crossing', subtitle: 'Era finale · Rail, river, reserve',
      briefing: 'Two river channels and factory blocks create independent fronts. The rail bridge is wide but exposed; take the western repair yard or eastern signal tower to support a second crossing.',
      concept: 'Two vertical channels have three offset crossings, intersecting a long rail bridge corridor. Factory ruins break artillery coverage and force a choice between central speed and safer outer crossings.',
      paint: [['~', 9, 0, 2, 24], ['~', 18, 0, 2, 24], ['=', 9, 16, 2, 3], ['=', 9, 7, 2, 2], ['=', 18, 5, 2, 3], ['=', 18, 18, 2, 2], ['c', 2, 12, 24, 2], ['=', 9, 12, 2, 2], ['=', 18, 12, 2, 2], ['#', 12, 7, 4, 3], ['#', 13, 16, 4, 3], ['f', 3, 5, 4, 4], ['f', 22, 15, 3, 5], ['^', 21, 8, 4, 3], ['c', 12, 3, 4, 3]],
      sites: [['Western repair yard', 7, 16], ['Central switchyard', 14, 13], ['Eastern signal', 22, 10, 'watchtower'], ['Upper foundry', 14, 5]],
      budget: 1050, capacity: 29, reserve: 10, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout', 'scout'], roster: G,
      ai: [.72, .83, .86, .9], preferred: ['siege', 'frontline', 'engineer'], par: 520, thresholds: [800, 1550, 2400],
    },
  ],
  [
    {
      name: 'The Glass Corridor', subtitle: 'Urban lanes and parkland',
      briefing: 'Long streets favor marksmen, but the central park breaks sightlines. Use recon drones to expose street corners before moving assault teams past the transit terminal.',
      concept: 'Six urban blocks form long streets and short cross-alleys around a forested park. Stronghold positions encourage scouting intersections rather than blindly trading down one lane.',
      paint: [['#', 6, 5, 3, 5], ['#', 12, 4, 3, 4], ['#', 19, 6, 3, 4], ['#', 8, 15, 3, 5], ['#', 15, 16, 3, 4], ['#', 22, 13, 3, 5], ['f', 11, 10, 7, 4], ['c', 3, 12, 7, 2], ['c', 18, 11, 7, 2], ['^', 18, 3, 3, 2], ['~', 2, 4, 2, 5]],
      sites: [['Transit terminal', 9, 12], ['Park relay', 14, 12, 'watchtower'], ['East concourse', 20, 12]],
      budget: 930, capacity: 25, reserve: 8, army: ['frontline', 'frontline', 'ranged', 'scout', 'scout'], roster: B,
      ai: [.6, .76, .62, .92], preferred: ['frontline', 'ranged', 'scout'], par: 370, thresholds: [600, 1200, 1850],
    },
    {
      name: 'The Sensor Coast', subtitle: 'Knowledge controls the causeway',
      briefing: 'The sea removes the southeastern flank. Capture the coastal sensor station to observe the causeway, then approach through the inland hills or cross the short harbor bridge.',
      concept: 'A jagged coast compresses the east into a causeway with a short water crossing. An inland forest route avoids the sensor hill but takes longer to reach the main stronghold.',
      paint: [['~', 18, 17, 10, 7], ['~', 23, 9, 5, 8], ['~', 20, 13, 3, 4], ['=', 23, 10, 3, 2], ['^', 16, 8, 5, 4], ['f', 6, 5, 5, 7], ['f', 11, 16, 5, 5], ['#', 14, 11, 1, 5], ['g', 14, 13, 1, 2], ['c', 8, 13, 5, 2], ['c', 18, 4, 4, 3]],
      sites: [['Inland supply post', 10, 14], ['Coastal sensor', 19, 10, 'watchtower'], ['Harbor checkpoint', 22, 8, 'gate']],
      budget: 980, capacity: 26, reserve: 8, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: A,
      ai: [.48, .74, .86, .98], preferred: ['scout', 'siege', 'ranged'], par: 420, thresholds: [650, 1300, 2050],
    },
    {
      name: 'The Silent Perimeter', subtitle: 'Detection versus infiltration',
      briefing: 'The perimeter is riddled with concealed approaches. Secure the listening post with drone support, then split your assault between the wooded center and the open eastern service road.',
      concept: 'Dense forest corridors and broken walls create ambush pockets. The listening post overlooks the forest exit; a clear eastern road offers a visible but stealth-safe alternative.',
      paint: [['f', 5, 5, 5, 13], ['f', 13, 6, 4, 14], ['f', 18, 4, 4, 8], ['.', 5, 11, 17, 2], ['#', 10, 7, 3, 2], ['#', 17, 14, 4, 2], ['g', 11, 7, 1, 2], ['c', 9, 16, 4, 2], ['c', 18, 11, 4, 2], ['^', 22, 14, 4, 4], ['~', 2, 7, 2, 4]],
      sites: [['South perimeter', 10, 17], ['Listening post', 15, 11, 'watchtower'], ['Service road relay', 24, 15], ['North bunker', 17, 5]],
      budget: 1010, capacity: 27, reserve: 9, army: ['frontline', 'frontline', 'ranged', 'scout', 'scout', 'guard'], roster: A,
      ai: [.7, .82, .62, 1], preferred: ['stealth', 'scout', 'frontline'], par: 440, thresholds: [700, 1400, 2150],
    },
    {
      name: 'Switchback Heights', subtitle: 'A road above the valley',
      briefing: 'Stepped escarpments create three defensible turns. Use engineers to secure a staging turn, but leave room for your vehicles. Drones can watch the long outside flank.',
      concept: 'A stair-stepped cliff chain forces ground forces into a sequence of lateral turns. Deliberate gate cuts and two outside flanks keep the high-ground defense contestable.',
      paint: [['#', 5, 7, 10, 2], ['#', 13, 9, 2, 5], ['#', 13, 14, 9, 2], ['#', 20, 5, 2, 9], ['g', 9, 7, 3, 2], ['g', 13, 11, 2, 2], ['g', 20, 8, 2, 3], ['^', 7, 10, 5, 4], ['^', 16, 6, 3, 4], ['c', 8, 16, 5, 2], ['c', 16, 11, 3, 3], ['f', 3, 4, 3, 4], ['f', 22, 17, 4, 4], ['~', 9, 20, 5, 2]],
      sites: [['Lower switchback', 10, 17], ['Midpoint command', 17, 12], ['Highland sensor', 18, 7, 'watchtower']],
      budget: 1050, capacity: 28, reserve: 9, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: A,
      ai: [.43, .7, .96, .93], preferred: ['guard', 'engineer', 'siege'], par: 480, thresholds: [700, 1450, 2250],
    },
    {
      name: 'Horizon Citadel', subtitle: 'Era finale · An observed siege',
      briefing: 'Two defensive belts shelter the citadel. Capture the outer sensors to identify safe firing positions, then coordinate a main push and a mobile flank. Enemy reconnaissance can expose an unsupported siege battery.',
      concept: 'Two offset fortified belts contain distinct northern and southern access gates. Separate sensor objectives and outside cover reward counter-reconnaissance and simultaneous pressure.',
      paint: [['#', 10, 3, 2, 18], ['g', 10, 7, 2, 3], ['g', 10, 16, 2, 3], ['#', 18, 0, 2, 17], ['g', 18, 4, 2, 3], ['g', 18, 13, 2, 3], ['^', 13, 6, 4, 4], ['^', 21, 11, 4, 3], ['c', 6, 14, 3, 4], ['c', 13, 13, 4, 3], ['c', 21, 6, 4, 3], ['f', 4, 5, 4, 5], ['f', 13, 18, 4, 4], ['~', 23, 17, 4, 5]],
      sites: [['Outer sensor', 8, 13, 'watchtower'], ['Forward command', 15, 14], ['Citadel sensor', 21, 10, 'watchtower'], ['Southern reserve post', 17, 19]],
      budget: 1160, capacity: 30, reserve: 10, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout', 'scout'], roster: A,
      ai: [.75, .85, .94, 1], preferred: ['siege', 'guard', 'stealth'], par: 540, thresholds: [850, 1650, 2550],
    },
  ],
  [
    {
      name: 'The Landing Corridor', subtitle: 'A colony divided by voids',
      briefing: 'Energy chasms break the colony into three dry approaches. Secure a relay to increase your field capacity, then use phase skimmers to reveal the distant precision teams before moving marines.',
      concept: 'Three staggered void pockets form an open northern lane, a protected winding center and a wide southern approach. Long beam ranges make visible crossing decisions essential.',
      paint: [['~', 7, 8, 4, 6], ['~', 14, 3, 4, 5], ['~', 17, 15, 5, 6], ['=', 9, 10, 2, 2], ['f', 4, 4, 4, 3], ['f', 18, 9, 4, 4], ['^', 10, 15, 5, 3], ['^', 20, 5, 4, 3], ['c', 11, 10, 4, 3], ['c', 5, 16, 4, 2], ['#', 23, 11, 3, 3]],
      sites: [['Landing relay', 8, 16], ['Central array', 13, 11], ['Upper sensor', 21, 7, 'watchtower']],
      budget: 1030, capacity: 26, reserve: 8, army: ['frontline', 'frontline', 'ranged', 'scout', 'scout'], roster: B,
      ai: [.64, .78, .68, .95], preferred: ['frontline', 'ranged', 'scout'], par: 380, thresholds: [650, 1300, 2000],
    },
    {
      name: 'The Relay Archipelago', subtitle: 'Three islands, four bridges',
      briefing: 'The relay islands connect through offset bridges. Capture the middle relay and reform between crossings; an outer bridge permits a slower attack that avoids the central beam corridor.',
      concept: 'Three vertical chasms create four land bands with offset narrow and wide bridges. Two central relays let a divided army contest capacity while choosing its final crossing.',
      paint: [['~', 8, 0, 2, 24], ['~', 14, 0, 2, 24], ['~', 20, 0, 2, 24], ['=', 8, 16, 2, 3], ['=', 8, 5, 2, 2], ['=', 14, 11, 2, 3], ['=', 14, 19, 2, 2], ['=', 20, 6, 2, 3], ['=', 20, 17, 2, 2], ['^', 10, 5, 3, 4], ['^', 16, 14, 3, 3], ['f', 3, 7, 3, 4], ['f', 23, 14, 3, 6], ['c', 10, 14, 3, 3], ['c', 16, 6, 3, 3]],
      sites: [['West relay', 11, 15], ['Middle relay', 17, 12], ['Island sensor', 18, 7, 'watchtower'], ['Outer docking node', 24, 16]],
      budget: 1090, capacity: 28, reserve: 9, army: ['frontline', 'frontline', 'guard', 'ranged', 'scout'], roster: A,
      ai: [.55, .88, .82, 1], preferred: ['guard', 'scout', 'siege'], par: 460, thresholds: [750, 1450, 2250],
    },
    {
      name: 'The Prism Basin', subtitle: 'A fortress below the rim',
      briefing: 'The basin rim has three entrances. The central prism tower grants useful vision, but holding it alone invites fire from the rim. Secure a second entrance before the final advance.',
      concept: 'A rectangular cliff basin has three nonaligned gates and a central tower. Units on the outer rim can threaten basin exits, creating encirclement and counter-encirclement opportunities.',
      paint: [['#', 8, 5, 13, 2], ['#', 8, 17, 13, 2], ['#', 8, 5, 2, 14], ['#', 19, 5, 2, 14], ['g', 8, 13, 2, 3], ['g', 14, 5, 3, 2], ['g', 19, 9, 2, 3], ['^', 10, 7, 3, 3], ['^', 16, 14, 3, 3], ['f', 11, 12, 3, 4], ['f', 22, 14, 4, 5], ['c', 14, 9, 4, 3], ['~', 2, 7, 3, 4]],
      sites: [['West basin gate', 9, 14, 'gate'], ['Prism tower', 15, 12, 'watchtower'], ['East basin gate', 20, 10, 'gate'], ['Northern rim node', 15, 4]],
      budget: 1140, capacity: 29, reserve: 9, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout'], roster: A,
      ai: [.67, .82, .88, .97], preferred: ['ranged', 'guard', 'siege'], par: 480, thresholds: [800, 1550, 2400],
    },
    {
      name: 'The Dark Side', subtitle: 'A network of hidden approaches',
      briefing: 'Crystal groves and cover pockets conceal the inner colony. Keep skimmers near your precision teams, secure both sensor relays, then use a covered approach instead of exposing every unit to the central lane.',
      concept: 'Alternating crystal forests and defensive cover create a web of short ambush lanes. Two separated sensor relays reward anti-stealth coverage and coordinated independent groups.',
      paint: [['f', 5, 5, 4, 5], ['f', 10, 12, 4, 6], ['f', 17, 5, 4, 6], ['f', 20, 15, 4, 5], ['c', 6, 12, 3, 3], ['c', 11, 7, 4, 3], ['c', 15, 13, 4, 3], ['c', 20, 11, 4, 2], ['#', 14, 3, 2, 4], ['#', 7, 18, 4, 2], ['^', 16, 18, 3, 3], ['~', 23, 6, 3, 3], ['g', 14, 5, 2, 1]],
      sites: [['Lower sensor relay', 8, 14, 'watchtower'], ['Upper sensor relay', 18, 9, 'watchtower'], ['Crystal fabrication', 13, 17], ['Dark-side junction', 20, 12]],
      budget: 1180, capacity: 30, reserve: 10, army: ['frontline', 'frontline', 'ranged', 'ranged', 'scout', 'scout'], roster: A,
      ai: [.76, .85, .7, 1], preferred: ['stealth', 'scout', 'ranged'], par: 490, thresholds: [850, 1650, 2500],
    },
    {
      name: 'The Last Orbit', subtitle: 'Campaign finale · Every front matters',
      briefing: 'The orbital capital is divided by a broken cross of energy chasms. Secure the four command nodes, scout the bridge approaches, and use separate groups to fix defenders before the final coordinated occupation.',
      concept: 'A broken cross-shaped void, offset bridges, an inner gate and four independent objectives combine the campaign’s lessons. No single siege position covers all crossings and both capital entrances.',
      paint: [['~', 12, 0, 2, 19], ['~', 0, 11, 28, 2], ['=', 12, 5, 2, 3], ['=', 12, 16, 2, 3], ['=', 5, 11, 3, 2], ['=', 20, 11, 3, 2], ['#', 19, 3, 1, 7], ['#', 19, 9, 8, 1], ['g', 19, 5, 1, 2], ['g', 23, 9, 2, 1], ['^', 7, 6, 4, 3], ['^', 16, 15, 4, 3], ['f', 3, 4, 3, 5], ['f', 22, 16, 4, 5], ['c', 6, 15, 4, 3], ['c', 15, 6, 3, 3], ['c', 20, 13, 4, 2]],
      sites: [['Dawn command', 8, 16], ['Zenith sensor', 16, 7, 'watchtower'], ['Dusk command', 21, 16], ['Capital gate', 22, 8, 'gate']],
      budget: 1300, capacity: 32, reserve: 12, army: ['frontline', 'frontline', 'guard', 'ranged', 'ranged', 'scout', 'scout'], roster: A,
      ai: [.82, .9, .95, 1], preferred: ['siege', 'stealth', 'guard'], par: 600, thresholds: [1000, 1900, 2850],
    },
  ],
];

const WIDTH = 28;
const HEIGHT = 24;
function resolveMap(paints: Paint[], strongholds: StrongholdConfig[]): string[] {
  const rows: Terrain[][] = Array.from({ length: HEIGHT }, () => Array<Terrain>(WIDTH).fill('.'));
  for (const [tile, x, y, width, height] of paints) {
    for (let row = y; row < y + height; row++) for (let col = x; col < x + width; col++) {
      if (rows[row]?.[col] !== undefined) rows[row]![col] = tile;
    }
  }
  // Main deployment yards are part of every authored map's immutable design.
  for (const base of strongholds.filter(site => site.kind === 'main')) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) rows[base.y + dy]![base.x + dx] = '.';
  }
  // Strategic structures occupy passable terrain; gates and bridges retain their terrain.
  for (const site of strongholds) {
    if (rows[site.y]![site.x] === '~' || rows[site.y]![site.x] === '#') rows[site.y]![site.x] = site.kind === 'gate' ? 'g' : 'c';
  }
  return rows.map(row => row.join(''));
}

export const missions: MissionDef[] = plans.flatMap((eraPlans, era) => eraPlans.map((plan, index): MissionDef => {
  const id = `e${era + 1}m${index + 1}`;
  const strongholds: StrongholdConfig[] = [
    { id: `${id}-home`, name: 'Your main stronghold', kind: 'main', x: 4, y: HEIGHT - 5, owner: 0, capacity: 0, reward: 0, vision: 7 },
    { id: `${id}-enemy`, name: 'Enemy main stronghold', kind: 'main', x: WIDTH - 5, y: 4, owner: 1, capacity: 0, reward: 0, vision: 7 },
    ...plan.sites.map(([name, x, y, kind = 'outpost', owner = null], site): StrongholdConfig => ({
      id: `${id}-site-${site + 1}`, name, x, y, kind, owner,
      capacity: kind === 'outpost' ? 3 : kind === 'gate' ? 2 : 1,
      reward: 90 + era * 7 + index * 8 + (kind === 'outpost' ? 25 : 0),
      vision: kind === 'watchtower' ? 9 : kind === 'gate' ? 5 : 5.5,
    })),
  ];
  const [aggression, expansion, defense, scout] = plan.ai;
  return {
    id, era, index, name: plan.name, subtitle: plan.subtitle, briefing: plan.briefing, concept: plan.concept,
    finale: index === 4, seed: (era + 1) * 10007 + (index + 1) * 131,
    map: resolveMap(plan.paint, strongholds), strongholds,
    resources: [plan.budget, plan.budget], capacity: plan.capacity, reserveCapacity: plan.reserve,
    starting: [[...plan.army], [...plan.army]], roster: [...plan.roster],
    ai: { aggression, expansion, defense, scout, preferred: plan.preferred },
    thresholds: [...plan.thresholds], parTime: plan.par, ...(plan.tutorial ? { tutorial: plan.tutorial } : {}),
  };
}));
