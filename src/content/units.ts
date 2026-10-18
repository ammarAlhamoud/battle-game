import type { EraDef, Role, UnitDef } from '../contracts.js';

/** No global era multiplier: later technology changes engagement geometry instead. */
type UnitStats = [hp: number, damage: number, armor: number, attackTime: number, range: number, speed: number, cost: number, capacity: number, training: number, vision: number];
type Entry = [role: Role, name: string, description: string, stats: UnitStats];
const names: [string, string, string, string, string, string, string][] = [
  ['The First Fires', 'Hunter–Gatherer / Prehistoric', 'c. 12,000 BCE', '#b5ad7c', '#72775b', '#e7c68d', 'Fast hunters contest wooded trails. Short-range weapons make scouts and disciplined spear screens decisive.'],
  ['River Kingdoms', 'Bronze Age', 'c. 1800 BCE', '#d3a76d', '#88815e', '#f4d68e', 'Shield walls secure river crossings while composite bows and heavy rams create the first combined-arms assaults.'],
  ['Marble & Iron', 'Classical Antiquity', 'c. 200 BCE', '#d4c8a6', '#80876d', '#f0dfb9', 'Slow legionary cores support fast cavalry screens, long-range artillery and field engineers.'],
  ['The Walled Crown', 'Medieval Age', 'c. 1250 CE', '#9faf9c', '#657966', '#d2d9b1', 'Armored infantry hold gates; longbows, mounted scouts and siege engines contest fortified ground.'],
  ['Smoke & Sovereigns', 'Gunpowder Age', 'c. 1650 CE', '#b6a0a4', '#7c7970', '#eed1b0', 'Powerful but slow-firing muskets need pikemen and prepared firing lines. Cannon punish packed ranks.'],
  ['Engines of Change', 'Industrial Age', 'c. 1880 CE', '#a0afb6', '#6d7c79', '#d4d9c8', 'Accurate rifles, armored support and railway embankments reward suppression, cover and mobile reserves.'],
  ['A Divided Horizon', 'Modern Military', 'c. 2035 CE', '#86a8a0', '#5b746f', '#c9e4cc', 'Recon detection, covert infiltration, long-range fire support and combat engineers form an interdependent army.'],
  ['Beyond the Blue', 'Space Age', 'c. 2280 CE', '#aaa4d4', '#5c6788', '#dcd4ff', 'Energy shields, phase scouts and orbital siege frames fight across constrained colony causeways.'],
];

const rosters: Entry[][] = [
  [
    ['frontline', 'Flint spears', 'Inexpensive spears pin runners and protect hunters at close range.', [108, 18, 2, 1.15, 1.2, 1.58, 48, 1, 4.5, 5]],
    ['ranged', 'Sling hunters', 'Fragile skirmishers excel against exposed spears but need a screen.', [67, 16, 0, 1.4, 4.1, 1.5, 58, 1, 5.5, 6]],
    ['guard', 'Hide wardens', 'Heavy hides absorb sling fire. Slow movement makes flanking dangerous.', [158, 12, 5, 1.5, 1.1, 1.08, 72, 2, 7, 4.5]],
    ['scout', 'Trail runners', 'Wide vision and superior detection reveal woodland ambushes.', [58, 11, 0, .9, 1.15, 2.65, 44, 1, 3.6, 8]],
    ['stealth', 'Reed stalkers', 'Camouflaged hunters overwhelm isolated ranged units; scouts expose them.', [76, 26, 0, 1.3, 1.25, 1.92, 84, 1, 7, 5.6]],
  ],
  [
    ['frontline', 'Bronze spears', 'Reliable spear lines counter mobile troops and escort the ram.', [122, 21, 3, 1.25, 1.35, 1.45, 54, 1, 4.8, 5]],
    ['ranged', 'Composite bows', 'Long reach defeats open infantry; shields and stalkers counter the bow.', [66, 19, 0, 1.6, 5.3, 1.35, 65, 1, 6, 6]],
    ['guard', 'Tower shields', 'Very resilient frontal defenders trade mobility for occupation strength.', [184, 13, 7, 1.55, 1.15, .98, 84, 2, 7.5, 4.6]],
    ['scout', 'Chariot scouts', 'Rapid chariot patrols reveal flanks but suffer against braced spears.', [83, 15, 1, 1.15, 1.4, 2.75, 69, 1, 5.5, 8.5]],
    ['stealth', 'Marsh raiders', 'Reed camouflage enables attacks on the enemy bow line.', [78, 29, 1, 1.5, 1.25, 1.85, 91, 1, 7.5, 5.6]],
    ['siege', 'Covered ram', 'Slow crewed ram with heavy armor and exceptional occupation pressure.', [235, 42, 8, 3.2, 1.6, .65, 135, 3, 11, 4.2]],
  ],
  [
    ['frontline', 'Legionaries', 'Disciplined heavy infantry reliably screen artillery and capture ground.', [145, 22, 5, 1.3, 1.25, 1.35, 66, 1, 5.5, 5]],
    ['ranged', 'Javelin cohorts', 'Mobile medium-range volleys punish scouts and exposed artillery.', [83, 27, 1, 1.8, 3.8, 1.65, 67, 1, 5.7, 5.8]],
    ['guard', 'Phalanx wardens', 'Braced pikes counter cavalry and preserve contested capture zones.', [175, 18, 7, 1.6, 1.7, .95, 89, 2, 7.2, 4.5]],
    ['scout', 'Auxiliary cavalry', 'Fast cavalry provide long vision and intercept isolated skirmishers.', [93, 18, 2, 1.15, 1.25, 2.8, 76, 1, 6, 8.4]],
    ['stealth', 'Hill infiltrators', 'Light ambushers exploit forests and threaten siege crews.', [75, 31, 1, 1.4, 1.3, 1.95, 90, 1, 7.5, 6]],
    ['siege', 'Scorpion battery', 'Long-range bolts punish guards. Deployment speed is deliberately poor.', [106, 43, 2, 3.2, 7, .8, 126, 3, 10, 6]],
    ['engineer', 'Field artificers', 'Build finite-resource barriers and watchtowers; poor frontline fighters.', [86, 11, 2, 1.4, 1.2, 1.5, 80, 1, 6.8, 5.6]],
  ],
  [
    ['frontline', 'Men-at-arms', 'Armored melee troops push through archer fire with measured advances.', [150, 25, 6, 1.35, 1.2, 1.23, 73, 1, 5.8, 5]],
    ['ranged', 'Longbow companies', 'Extreme reach rewards hill positions; close attackers overwhelm them.', [68, 23, 0, 1.85, 6.4, 1.24, 74, 1, 6.2, 6.8]],
    ['guard', 'Pavise wardens', 'Heavy pavises offer exceptional defense and slow objective occupation.', [196, 15, 9, 1.65, 1.2, .88, 95, 2, 8, 4.5]],
    ['scout', 'Mounted outriders', 'Mobile outriders scout causeways and hunt unsupported archers.', [96, 19, 2, 1.2, 1.3, 2.9, 80, 1, 6.2, 8.6]],
    ['stealth', 'Woodland rangers', 'Concealed short bows deliver ambushes from flanking woodland.', [79, 25, 1, 1.55, 3.5, 1.86, 99, 1, 8, 6.2]],
    ['siege', 'Trebuchet crews', 'Slow siege volleys punish tight formations and guarded approaches.', [103, 48, 1, 3.6, 7.6, .62, 147, 3, 12, 6.1]],
    ['engineer', 'Castle sappers', 'Build barriers and towers to cover otherwise exposed siege crews.', [94, 13, 3, 1.5, 1.2, 1.35, 86, 1, 7, 5.6]],
  ],
  [
    ['frontline', 'Pike companies', 'Long pikes protect reloading musketeers and counter mobile attackers.', [139, 24, 4, 1.45, 1.8, 1.3, 65, 1, 5.4, 5.3]],
    ['ranged', 'Matchlock infantry', 'Lethal volleys have a long reload; exposed units need careful spacing.', [79, 37, 1, 2.45, 6, 1.19, 84, 1, 7, 6.4]],
    ['guard', 'Cuirassier guards', 'Armored defenders absorb musket pressure and contest strategic gates.', [186, 20, 8, 1.7, 1.25, 1.08, 102, 2, 8.5, 5]],
    ['scout', 'Dragoon patrols', 'Mounted carbine scouts detect ambushes and reposition between hills.', [88, 20, 1, 1.6, 3.5, 2.65, 87, 1, 6.5, 8.7]],
    ['siege', 'Field cannon', 'Splash cannon break packed lines but are vulnerable while repositioning.', [113, 49, 3, 3.3, 7.8, .78, 150, 3, 11.5, 6.4]],
    ['engineer', 'Military pioneers', 'Prepare defensive works to protect slow-firing gun lines.', [95, 15, 2, 1.6, 2.6, 1.42, 91, 1, 7.1, 5.8]],
  ],
  [
    ['frontline', 'Rifle sections', 'Accurate mid-range rifle fire rewards cover and dispersed advances.', [103, 25, 2, 1.35, 5.4, 1.5, 76, 1, 5.8, 6.5]],
    ['ranged', 'Sharpshooters', 'Long-range precision counters exposed crewed weapons; fragile under pressure.', [68, 39, 0, 2.3, 7.5, 1.24, 99, 1, 7.2, 7.8]],
    ['guard', 'Armored carriers', 'Slow armored platforms protect exposed crossings at high capacity cost.', [243, 26, 10, 1.9, 4.1, .98, 136, 3, 10, 5.5]],
    ['scout', 'Mounted signals', 'Fast relay patrols reveal artillery and capture neglected stations.', [80, 18, 1, 1.5, 3.6, 2.8, 79, 1, 5.6, 9]],
    ['siege', 'Howitzer battery', 'Arcing splash punishes stationary clusters and demands a protective screen.', [104, 56, 2, 3.9, 8.4, .7, 160, 3, 12, 6.9]],
    ['engineer', 'Railway engineers', 'Build cover at junctions and preserve supply paths through chokepoints.', [102, 19, 2, 1.65, 3.8, 1.48, 95, 1, 7.2, 6.2]],
  ],
  [
    ['frontline', 'Assault teams', 'Mobile automatic infantry counter exposed specialists at medium range.', [112, 22, 3, .96, 4.9, 1.8, 88, 1, 6.1, 6.8]],
    ['ranged', 'Marksman teams', 'Precision teams remove high-value exposed targets from distant cover.', [74, 41, 1, 2.1, 7.9, 1.3, 111, 1, 7.7, 8]],
    ['guard', 'Shield vehicles', 'Armored defensive vehicles hold capture lanes but attract siege fire.', [258, 28, 12, 1.8, 4.7, 1.06, 152, 3, 10.6, 6]],
    ['scout', 'Recon drones', 'High-speed detection patrols expose covert teams; light armor needs care.', [65, 12, 1, 1, 3.8, 3.1, 83, 1, 5, 10]],
    ['stealth', 'Covert teams', 'Concealed teams use close-range bursts against artillery and marksmen.', [86, 35, 2, 1.35, 3.7, 2, 121, 1, 8.2, 6.7]],
    ['siege', 'Rocket artillery', 'Wide-area fire breaks entrenched heavy forces, with slow rate and mobility.', [112, 58, 3, 4, 8.8, .82, 174, 3, 12.5, 6.6]],
    ['engineer', 'Combat engineers', 'Build tactical barriers and sensor towers at finite resource cost.', [114, 21, 3, 1.45, 4.2, 1.62, 105, 1, 7.3, 6.8]],
  ],
  [
    ['frontline', 'Pulse marines', 'Rapid pulse fire supports mobile occupation across colony causeways.', [121, 21, 4, .86, 5.2, 1.95, 96, 1, 6.3, 7]],
    ['ranged', 'Prism lancers', 'Charged precision beams defeat exposed heavy specialists over long sightlines.', [77, 45, 1, 2.1, 8.2, 1.35, 124, 1, 8, 8.4]],
    ['guard', 'Aegis frames', 'Durable shield frames hold narrow routes but struggle to pursue flankers.', [279, 27, 13, 1.65, 3.2, 1.1, 166, 3, 11, 6]],
    ['scout', 'Phase skimmers', 'Exceptional speed, vision and detection secure the broken outer colonies.', [72, 16, 2, 1.1, 4.1, 3.3, 94, 1, 5.5, 10.5]],
    ['stealth', 'Null operatives', 'Phase-cloaked close-range fighters threaten precision and siege units.', [94, 39, 3, 1.3, 3.5, 2.16, 138, 1, 9, 7]],
    ['siege', 'Orbital walkers', 'Slow plasma siege walkers punish armored clusters with wide splash.', [154, 64, 5, 4.1, 9, .86, 192, 3, 13, 7]],
    ['engineer', 'Fabricator teams', 'Construct energy barriers and sensor towers using finite battle resources.', [119, 22, 4, 1.4, 4.3, 1.7, 115, 1, 7.7, 7]],
  ],
];

function unit(era: number, entry: Entry): UnitDef {
  const [role, name, description, stats] = entry;
  const [hp, damage, armor, attackTime, range, speed, cost, capacity, training, vision] = stats;
  return {
    id: `e${era + 1}-${role}`, era, name, role, description,
    hp, damage, armor, attackTime, range, speed, cost, capacity, training, vision,
    capture: role === 'guard' ? 1.35 : role === 'siege' ? 1.75 : role === 'scout' ? .72 : role === 'engineer' ? 1.15 : 1,
    stealth: role === 'stealth', detection: role === 'scout' ? 6.5 : role === 'engineer' ? 2.5 : 1.6,
    splash: role === 'siege' && era >= 3 ? 1.45 + era * .07 : 0,
    counters: role === 'frontline' ? { scout: 1.35, stealth: 1.2 }
      : role === 'ranged' ? { frontline: 1.3, engineer: 1.15, guard: .8 }
      : role === 'guard' ? { ranged: 1.3, scout: 1.2, siege: .7 }
      : role === 'scout' ? { stealth: 1.45, siege: 1.25, guard: .65 }
      : role === 'stealth' ? { ranged: 1.65, siege: 1.7, guard: .65 }
      : role === 'siege' ? { guard: 1.7, frontline: 1.2, scout: .65, stealth: .65 }
      : { siege: 1.2, frontline: .8 },
    ...(['stealth', 'siege', 'engineer'].includes(role) ? { skill: `e${era + 1}-${role}` } : {}),
  };
}

export const eras: EraDef[] = names.map(([name, subtitle, years, color, ground, accent, description], id) => ({
  id, name, subtitle, years, color, ground, accent, description,
  art: `./art/era-${id + 1}.svg`, units: rosters[id]!.map(entry => unit(id, entry)),
}));
