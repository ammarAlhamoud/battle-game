import type { SkillDef } from '../contracts.js';

export const skills: SkillDef[] = [
  { id: 'discipline', name: 'Common discipline', description: 'Unlock wedge, spread and shield formations. Basic line and column are always available.', era: null, cost: 1, prerequisites: [], effect: 'formations', value: 1, x: 300, y: 60 },
  { id: 'logistics', name: 'Army logistics', description: 'Permanently add four deployed army capacity.', era: null, cost: 2, prerequisites: ['discipline'], effect: 'capacity', value: 4, x: 100, y: 210 },
  { id: 'fieldcraft', name: 'Fieldcraft', description: 'All current-era units gain one cell of vision.', era: null, cost: 2, prerequisites: ['discipline'], effect: 'vision', value: 1, x: 500, y: 210 },
  { id: 'parallel-lines', name: 'Parallel training', description: 'Add a second independent production line at the main stronghold.', era: null, cost: 3, prerequisites: ['logistics'], effect: 'lines', value: 1, x: 20, y: 360 },
  { id: 'reserves', name: 'Organized reserves', description: 'Add four reserve places without consuming deployed army capacity.', era: null, cost: 2, prerequisites: ['logistics'], effect: 'reserve', value: 4, x: 190, y: 360 },
  { id: 'rally', name: 'Rally signal', description: 'Unlock a targeted rally: spend 30 battle resources to restore nearby allied health; 45 second cooldown.', era: null, cost: 2, prerequisites: ['fieldcraft'], effect: 'rally', value: 1, x: 410, y: 360 },
  { id: 'recon', name: 'Reconnaissance network', description: 'Unlock a targeted vision pulse for 25 resources; 35 second cooldown. Detection still obeys vision.', era: null, cost: 2, prerequisites: ['fieldcraft'], effect: 'recon', value: 1, x: 580, y: 360 },
  { id: 'drill', name: 'Standardized drill', description: 'Reduce training time by 15 percent for the current roster.', era: null, cost: 3, prerequisites: ['parallel-lines'], effect: 'training', value: .15, x: 20, y: 510 },
  { id: 'grand-logistics', name: 'Expeditionary corps', description: 'Add six deployed army capacity beyond the logistics upgrade.', era: null, cost: 4, prerequisites: ['reserves'], effect: 'capacity', value: 6, x: 190, y: 510 },
  { id: 'volley', name: 'Coordinated volley', description: 'Unlock a visible-target area strike for 45 resources; 55 second cooldown.', era: null, cost: 3, prerequisites: ['rally', 'recon'], effect: 'volley', value: 1, x: 410, y: 510 },
  { id: 'construction', name: 'Field fortification', description: 'Engineers build barriers and towers for 20 percent fewer battle resources.', era: null, cost: 3, prerequisites: ['recon'], effect: 'construction', value: .2, x: 580, y: 510 },
  { id: 'occupation', name: 'Occupation doctrine', description: 'Increase all qualifying units’ capture contribution by 20 percent.', era: null, cost: 3, prerequisites: ['grand-logistics', 'volley'], effect: 'capture', value: .2, x: 300, y: 660 },

  { id: 'e1-stealth', name: 'Reed camouflage', description: 'Unlock Reed stalkers, fragile close-range ambushers countered by Trail runners.', era: 0, cost: 1, prerequisites: ['fieldcraft'], effect: 'stealth', value: 1, x: 480, y: 840 },
  { id: 'e1-hidework', name: 'Layered hidework', description: 'Prehistoric troops gain two armor against every hit.', era: 0, cost: 1, prerequisites: ['logistics'], effect: 'armor', value: 2, x: 120, y: 840 },
  { id: 'e1-trails', name: 'Shared hunting trails', description: 'Prehistoric occupation contribution increases by 25 percent.', era: 0, cost: 2, prerequisites: ['e1-stealth', 'e1-hidework'], effect: 'capture', value: .25, x: 300, y: 1000 },

  { id: 'e2-stealth', name: 'Marsh warfare', description: 'Unlock Marsh raiders for concealed attacks on bow companies.', era: 1, cost: 1, prerequisites: ['fieldcraft'], effect: 'stealth', value: 1, x: 480, y: 840 },
  { id: 'e2-siege', name: 'Covered assault', description: 'Unlock the Covered ram: slow, durable and powerful at occupying fortifications.', era: 1, cost: 1, prerequisites: ['logistics'], effect: 'siege', value: 1, x: 120, y: 840 },
  { id: 'e2-shields', name: 'Bronze lamination', description: 'Bronze Age troops gain two armor.', era: 1, cost: 2, prerequisites: ['e2-siege'], effect: 'armor', value: 2, x: 120, y: 1000 },
  { id: 'e2-drill', name: 'Palace musters', description: 'Bronze Age training is 15 percent faster.', era: 1, cost: 2, prerequisites: ['e2-stealth'], effect: 'training', value: .15, x: 480, y: 1000 },
];

const eraSkills: [number, string, string, string, string][] = [
  [2, 'Hill auxiliaries', 'Torsion engines', 'Field artificers', 'Legionary drill'],
  [3, 'Forest charters', 'Counterweight engines', 'Castle sappers', 'Tempered steel'],
  [4, '', 'Gunnery schools', 'Military pioneers', 'Measured volleys'],
  [5, '', 'Indirect fire', 'Railway engineers', 'Factory standards'],
  [6, 'Low-signature doctrine', 'Rocket batteries', 'Combat engineers', 'Combined arms'],
  [7, 'Phase-cloak theory', 'Orbital siege', 'Matter fabrication', 'Resonant shielding'],
];
for (const [era, stealth, siege, engineer, final] of eraSkills) {
  const prefix = `e${era + 1}`;
  if (stealth) skills.push({ id: `${prefix}-stealth`, name: stealth, description: `Unlock the ${era === 2 ? 'Hill infiltrators' : era === 3 ? 'Woodland rangers' : era === 6 ? 'Covert teams' : 'Null operatives'} for the current era.`, era, cost: 1, prerequisites: ['fieldcraft'], effect: 'stealth', value: 1, x: 500, y: 840 });
  skills.push(
    { id: `${prefix}-siege`, name: siege, description: 'Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity.', era, cost: 1, prerequisites: ['logistics'], effect: 'siege', value: 1, x: 100, y: 840 },
    { id: `${prefix}-engineer`, name: engineer, description: 'Unlock this era’s engineer unit and resource-funded tactical construction.', era, cost: 1, prerequisites: ['fieldcraft'], effect: 'engineer', value: 1, x: 300, y: 840 },
    { id: `${prefix}-doctrine`, name: final, description: era === 3 || era === 7 ? 'Current-era units gain two armor.' : era === 5 ? 'Current-era training is 15 percent faster.' : 'Current-era units deal 12 percent more damage.', era, cost: 2, prerequisites: [`${prefix}-siege`, `${prefix}-engineer`], effect: era === 3 || era === 7 ? 'armor' : era === 5 ? 'training' : 'damage', value: era === 3 || era === 7 ? 2 : era === 5 ? .15 : .12, x: 300, y: 1000 },
  );
}
