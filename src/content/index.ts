import type { GameContent, MissionDef, Role, SkillEffect } from '../contracts.js';
import { eras } from './units.js';
import { missions } from './missions.js';
import { skills } from './skills.js';

export const content: GameContent = { eras, missions, skills };

const ROLES = new Set<Role>(['frontline', 'ranged', 'guard', 'scout', 'stealth', 'siege', 'engineer']);
const EFFECTS = new Set<SkillEffect>(['capacity', 'reserve', 'lines', 'training', 'damage', 'armor', 'vision', 'capture', 'engineer', 'stealth', 'siege', 'formations', 'rally', 'recon', 'volley', 'construction']);
const TILES = new Set('.f^~=#gc');
const finite = (value: number, min: number, max: number): boolean => Number.isFinite(value) && value >= min && value <= max;
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

function schemaErrors(data: unknown): string[] {
  if (!object(data) || !Array.isArray(data.eras) || !Array.isArray(data.missions) || !Array.isArray(data.skills)) return ['Content requires eras, missions and skills arrays.'];
  const errors: string[] = [];
  const fields = (entry: Record<string, unknown>, path: string, names: string[], type: 'number' | 'string'): void => {
    for (const name of names) if (typeof entry[name] !== type) errors.push(`${path}.${name} must be a ${type}.`);
  };
  data.eras.forEach((era, index) => {
    const path = `eras[${index}]`;
    if (!object(era)) { errors.push(`${path} must be an era object.`); return; }
    fields(era, path, ['id'], 'number');
    fields(era, path, ['name', 'description', 'subtitle', 'years', 'color', 'ground', 'accent', 'art'], 'string');
    if (!Array.isArray(era.units)) { errors.push(`${path}.units must be an array.`); return; }
    era.units.forEach((unit, unitIndex) => {
      const unitPath = `${path}.units[${unitIndex}]`;
      if (!object(unit)) { errors.push(`${unitPath} must be a unit object.`); return; }
      fields(unit, unitPath, ['id', 'name', 'role', 'description'], 'string');
      fields(unit, unitPath, ['era', 'hp', 'damage', 'armor', 'attackTime', 'range', 'speed', 'cost', 'capacity', 'training', 'vision', 'capture', 'detection', 'splash'], 'number');
      if (typeof unit.stealth !== 'boolean' || !object(unit.counters)) errors.push(`${unitPath} requires boolean stealth and a counter object.`);
      if (unit.skill !== undefined && typeof unit.skill !== 'string') errors.push(`${unitPath}.skill must be a string.`);
    });
  });
  data.skills.forEach((skill, index) => {
    const path = `skills[${index}]`;
    if (!object(skill)) { errors.push(`${path} must be a skill object.`); return; }
    fields(skill, path, ['id', 'name', 'description', 'effect'], 'string');
    fields(skill, path, ['cost', 'value', 'x', 'y'], 'number');
    if (skill.era !== null && typeof skill.era !== 'number') errors.push(`${path}.era must be a number or null.`);
    if (!stringArray(skill.prerequisites)) errors.push(`${path}.prerequisites must be a string array.`);
  });
  data.missions.forEach((mission, index) => {
    const path = `missions[${index}]`;
    if (!object(mission)) { errors.push(`${path} must be a mission object.`); return; }
    fields(mission, path, ['id', 'name', 'subtitle', 'briefing', 'concept'], 'string');
    fields(mission, path, ['era', 'index', 'seed', 'capacity', 'reserveCapacity', 'parTime'], 'number');
    if (typeof mission.finale !== 'boolean' || !stringArray(mission.map) || !stringArray(mission.roster)) errors.push(`${path} requires a boolean finale, string map rows and a role roster.`);
    if (mission.tutorial !== undefined && typeof mission.tutorial !== 'string') errors.push(`${path}.tutorial must be a string.`);
    for (const name of ['resources', 'thresholds']) if (!Array.isArray(mission[name]) || !(mission[name] as unknown[]).every(value => typeof value === 'number')) errors.push(`${path}.${name} must be a number array.`);
    if (!Array.isArray(mission.starting) || mission.starting.length !== 2 || !mission.starting.every(stringArray)) errors.push(`${path}.starting must contain two role arrays.`);
    if (!object(mission.ai) || !stringArray(mission.ai.preferred)) errors.push(`${path}.ai requires a preferred role array.`);
    else fields(mission.ai, `${path}.ai`, ['aggression', 'expansion', 'defense', 'scout'], 'number');
    if (!Array.isArray(mission.strongholds)) { errors.push(`${path}.strongholds must be an array.`); return; }
    mission.strongholds.forEach((site, siteIndex) => {
      const sitePath = `${path}.strongholds[${siteIndex}]`;
      if (!object(site)) { errors.push(`${sitePath} must be a stronghold object.`); return; }
      fields(site, sitePath, ['id', 'name', 'kind'], 'string');
      fields(site, sitePath, ['x', 'y', 'capacity', 'reward', 'vision'], 'number');
      if (site.owner !== null && typeof site.owner !== 'number') errors.push(`${sitePath}.owner must be a side number or null.`);
    });
  });
  return errors;
}

/** Runtime validation is dependency-free and runs before a campaign can start. */
export function validateContent(data: GameContent): string[] {
  const errors = schemaErrors(data);
  if (errors.length) return errors;
  const check = (valid: unknown, message: string): void => { if (!valid) errors.push(message); };
  check(data.eras.length === 8, 'Exactly eight eras are required.');
  check(data.missions.length === 40, 'Exactly forty missions are required.');
  const skillById = new Map(data.skills.map(skill => [skill.id, skill]));
  check(skillById.size === data.skills.length, 'Skill IDs must be unique.');
  const unitIds = new Set<string>();
  for (let eraIndex = 0; eraIndex < data.eras.length; eraIndex++) {
    const era = data.eras[eraIndex]!;
    check(era.id === eraIndex, `Era ${eraIndex} must be ordered by ID.`);
    check(Boolean(era.name && era.description && era.subtitle), `Era ${eraIndex} requires complete identity.`);
    check(era.art === `./art/era-${eraIndex + 1}.svg`, `Era ${eraIndex} must reference its bundled art.`);
    check(Array.isArray(era.units) && era.units.length >= 5 && era.units.length <= 7, `Era ${eraIndex} needs five to seven unit types.`);
    const roles = new Set(era.units.map(unit => unit.role));
    check(roles.size === era.units.length, `Era ${eraIndex} repeats a role.`);
    for (const role of ['frontline', 'ranged', 'guard', 'scout']) check(roles.has(role as Role), `Era ${eraIndex} lacks baseline ${role}.`);
    for (const unit of era.units) {
      check(!unitIds.has(unit.id), `Duplicate unit ${unit.id}.`); unitIds.add(unit.id);
      check(unit.id === `e${era.id + 1}-${unit.role}` && unit.era === era.id && ROLES.has(unit.role), `Unit ${unit.id} has inconsistent identity.`);
      check(Boolean(unit.name && unit.description), `Unit ${unit.id} requires a name and tactical description.`);
      for (const [key, min, max] of [
        ['hp', 20, 1000], ['damage', 1, 200], ['armor', 0, 50], ['attackTime', .2, 10], ['range', .5, 12],
        ['speed', .3, 6], ['cost', 20, 400], ['capacity', 1, 6], ['training', 1, 30], ['vision', 2, 14],
        ['capture', .1, 4], ['detection', .1, 12], ['splash', 0, 5],
      ] as const) check(finite(unit[key], min, max), `Unit ${unit.id}.${key} is outside supported bounds.`);
      check(Number.isInteger(unit.capacity), `Unit ${unit.id} capacity must be an integer.`);
      check(typeof unit.stealth === 'boolean' && unit.stealth === (unit.role === 'stealth'), `Unit ${unit.id} has invalid stealth state.`);
      for (const [target, multiplier] of Object.entries(unit.counters)) check(ROLES.has(target as Role) && typeof multiplier === 'number' && finite(multiplier, .25, 3), `Unit ${unit.id} has invalid counter ${target}.`);
      if (unit.skill) {
        const skill = skillById.get(unit.skill);
        check(skill && skill.era === era.id && skill.effect === unit.role, `Unit ${unit.id} has an invalid era-specific unlock.`);
      } else check(['frontline', 'ranged', 'guard', 'scout'].includes(unit.role), `Specialist ${unit.id} requires an unlock.`);
    }
    check(new Set(era.units.map(unit => unit.range)).size >= 4, `Era ${eraIndex} needs differentiated engagement ranges.`);
    check(new Set(era.units.map(unit => unit.speed)).size >= 4, `Era ${eraIndex} needs differentiated mobility.`);
    const eraMissions = data.missions.filter(mission => mission.era === era.id);
    check(eraMissions.length === 5, `Era ${eraIndex} requires exactly five missions.`);
    for (let index = 0; index < 5; index++) check(eraMissions.some(mission => mission.index === index && mission.id === `e${eraIndex + 1}m${index + 1}`), `Era ${eraIndex} is missing mission ${index + 1}.`);
    const eraSkills = data.skills.filter(skill => skill.era === era.id);
    check(eraSkills.length >= 3 && eraSkills.length <= 4, `Era ${eraIndex} requires three or four branching skills.`);
  }
  check(new Set(data.missions.map(mission => mission.id)).size === data.missions.length, 'Mission IDs must be unique.');
  check(new Set(data.missions.map(mission => mission.map.join('\n'))).size === data.missions.length, 'Every mission must have a distinct authored map.');
  check(new Set(data.missions.map(mission => mission.concept)).size === data.missions.length, 'Every mission must have a distinct tactical concept.');
  const allSites = new Set<string>();
  for (const mission of data.missions) validateMission(mission, data, errors, allSites);
  for (const skill of data.skills) {
    check(Boolean(skill.id && skill.name && skill.description), 'Every skill requires a complete identity.');
    check(skill.era === null || Number.isInteger(skill.era) && finite(skill.era, 0, 7), `Skill ${skill.id} has invalid era.`);
    check(Number.isInteger(skill.cost) && finite(skill.cost, 1, 8), `Skill ${skill.id} has invalid cost.`);
    check(EFFECTS.has(skill.effect) && finite(skill.value, .01, 20), `Skill ${skill.id} has invalid effect or value.`);
    check(finite(skill.x, 0, 2000) && finite(skill.y, 0, 2000), `Skill ${skill.id} has invalid tree coordinates.`);
    check(new Set(skill.prerequisites).size === skill.prerequisites.length, `Skill ${skill.id} repeats a prerequisite.`);
    for (const id of skill.prerequisites) {
      const parent = skillById.get(id);
      check(parent && (parent.era === null || parent.era === skill.era), `Skill ${skill.id} has an invalid prerequisite ${id}.`);
    }
  }
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) { errors.push(`Skill prerequisite cycle at ${id}.`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const parent of skillById.get(id)?.prerequisites ?? []) if (skillById.has(parent)) visit(parent);
    visiting.delete(id); visited.add(id);
  };
  for (const id of skillById.keys()) visit(id);
  return errors;
}

function validateMission(mission: MissionDef, data: GameContent, errors: string[], allSites: Set<string>): void {
  const check = (valid: unknown, message: string): void => { if (!valid) errors.push(`${mission.id}: ${message}`); };
  const era = data.eras.find(item => item.id === mission.era);
  check(era && mission.id === `e${mission.era + 1}m${mission.index + 1}` && mission.index >= 0 && mission.index < 5, 'invalid campaign position.');
  check(mission.finale === (mission.index === 4), 'only the fifth mission may be an era finale.');
  check(Boolean(mission.name && mission.subtitle && mission.briefing && mission.concept), 'incomplete mission identity.');
  check(mission.briefing.length > 80 && mission.concept.length > 80, 'mission requires a substantive briefing and tactical concept.');
  check(Number.isInteger(mission.seed) && finite(mission.seed, 1, 2 ** 31), 'invalid deterministic seed.');
  check(mission.resources.length === 2 && mission.resources.every(value => Number.isInteger(value) && finite(value, 200, 3000)), 'invalid finite starting resources.');
  check(mission.resources[0] === mission.resources[1], 'both sides must receive the same starting budget.');
  check(Number.isInteger(mission.capacity) && finite(mission.capacity, 10, 64), 'invalid army capacity.');
  check(Number.isInteger(mission.reserveCapacity) && finite(mission.reserveCapacity, 2, 24), 'invalid reserve capacity.');
  check(finite(mission.parTime, 120, 1200), 'invalid par time.');
  check(mission.thresholds.length >= 3 && mission.thresholds.every((threshold, i) => Number.isInteger(threshold) && threshold > 0 && (i === 0 || threshold > mission.thresholds[i - 1]!)), 'score thresholds must be positive and strictly ascending.');
  for (const [key, value] of Object.entries(mission.ai)) if (key !== 'preferred') check(typeof value === 'number' && finite(value, 0, 1), `invalid AI ${key} weight.`);
  const roles = new Map(era?.units.map(unit => [unit.role, unit]) ?? []);
  check(mission.roster.length >= 4 && new Set(mission.roster).size === mission.roster.length, 'roster must contain at least four distinct roles.');
  for (const role of [...mission.roster, ...mission.ai.preferred]) check(roles.has(role), `unresolved unit role ${role}.`);
  for (const army of mission.starting) {
    check(army.length >= 4 && army.every(role => mission.roster.includes(role)), 'starting army uses unavailable roles.');
    check(army.reduce((total, role) => total + (roles.get(role)?.capacity ?? 1000), 0) <= mission.capacity, 'starting army exceeds deployed capacity.');
    check(army.every(role => !roles.get(role)?.skill), 'starting armies may not bypass specialist skill unlocks.');
  }
  const width = mission.map[0]?.length ?? 0;
  const height = mission.map.length;
  const validMap = width >= 20 && height >= 20 && mission.map.every(row => row.length === width && [...row].every(tile => TILES.has(tile)));
  check(validMap, 'map must be rectangular, supported terrain and at least 20 × 20.');
  if (!validMap) return;
  check(mission.map.some(row => row.includes('f')) && mission.map.some(row => row.includes('^')) && mission.map.some(row => row.includes('c')), 'map needs forest, elevation and defensive cover.');
  check(mission.strongholds.filter(site => site.kind === 'main' && site.owner === 0).length === 1 && mission.strongholds.filter(site => site.kind === 'main' && site.owner === 1).length === 1, 'exactly one main stronghold per faction is required.');
  check(mission.strongholds.filter(site => site.kind !== 'main').length >= 3, 'at least three subsidiary strongholds are required.');
  const coords = new Set<string>();
  for (const site of mission.strongholds) {
    check(!allSites.has(site.id), `duplicate strategic structure ${site.id}.`); allSites.add(site.id);
    const coord = `${site.x},${site.y}`;
    check(!coords.has(coord), 'strategic structures may not overlap.'); coords.add(coord);
    check(Number.isInteger(site.x) && Number.isInteger(site.y) && site.x >= 0 && site.x < width && site.y >= 0 && site.y < height, `invalid position for ${site.id}.`);
    check(site.owner === null || site.owner === 0 || site.owner === 1, `invalid owner for ${site.id}.`);
    check(['main', 'outpost', 'watchtower', 'gate'].includes(site.kind), `invalid structure kind for ${site.id}.`);
    check(finite(site.capacity, 0, 10) && finite(site.reward, 0, 400) && finite(site.vision, 1, 14), `invalid strategic bonuses for ${site.id}.`);
    if (site.kind !== 'main') check(site.reward > 0 && site.capacity > 0, `subsidiary ${site.id} needs finite capture and control rewards.`);
    check(!['~', '#'].includes(mission.map[site.y]?.[site.x] ?? '#'), `objective ${site.id} is on impassable terrain.`);
  }
  const home = mission.strongholds.find(site => site.kind === 'main' && site.owner === 0);
  if (!home) return;
  const visited = new Set<number>();
  const queue = [home.y * width + home.x];
  visited.add(queue[0]!);
  for (let head = 0; head < queue.length; head++) {
    const position = queue[head]!;
    const x = position % width;
    const y = Math.floor(position / width);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx === undefined || ny === undefined || nx < 0 || nx >= width || ny < 0 || ny >= height || ['~', '#'].includes(mission.map[ny]![nx]!)) continue;
      const next = ny * width + nx;
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  for (const site of mission.strongholds) check(visited.has(site.y * width + site.x), `objective ${site.name} is unreachable from the player main stronghold.`);
}
