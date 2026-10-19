import type {
  BattleState, Campaign, GameContent, SaveData, SkillDef,
} from '../contracts.js';
import { content } from '../content/index.js';

const INITIAL_POINTS = 3;
const RESPEC_COST = 1;
const MAX_SAVE_BYTES = 16 * 1024 * 1024;
const DB_NAME = 'eightfold-saves';
const DB_VERSION = 1;
const STORE = 'snapshots';

export function createCampaign(): Campaign {
  return { version: 1, records: {}, points: INITIAL_POINTS, skills: [], selectedEra: 0, tutorial: true, totalEarned: INITIAL_POINTS, language: 'en', difficulty: 'relaxed' };
}

export function isMissionUnlocked(campaign: Campaign, missionId: string, data: GameContent): boolean {
  const missions = [...data.missions].sort((a, b) => a.era - b.era || a.index - b.index);
  const index = missions.findIndex(m => m.id === missionId);
  return index >= 0 && (index === 0 || campaign.records[missions[index - 1].id]?.victory === true);
}

function skillAvailable(campaign: Campaign, skill: SkillDef, data: GameContent): boolean {
  return skill.era === null || data.missions.some(m => m.era === skill.era && isMissionUnlocked(campaign, m.id, data));
}

/** Returns a user-facing reason, or null after a successful, atomic purchase. */
export function buySkill(campaign: Campaign, id: string, data: GameContent, inBattle = false): string | null {
  if (inBattle) return 'Skills can only be purchased between missions.';
  const skill = data.skills.find(s => s.id === id);
  if (!skill) return 'Unknown skill.';
  if (campaign.skills.includes(id)) return 'This skill is already purchased.';
  if (!skillAvailable(campaign, skill, data)) return 'Reach this era before purchasing its skills.';
  if (!skill.prerequisites.every(p => campaign.skills.includes(p))) return 'Purchase the connected prerequisite skills first.';
  if (campaign.points < skill.cost) return 'Not enough skill points.';
  campaign.points -= skill.cost;
  campaign.skills.push(id);
  return null;
}

/** Refund all purchases, charging one non-refundable point for redistribution. */
export function respec(campaign: Campaign, data: GameContent, inBattle = false): string | null {
  if (inBattle) return 'Skills can only be reset between missions.';
  if (!campaign.skills.length) return 'There are no purchased skills to reset.';
  const refund = campaign.skills.reduce((sum, id) => sum + (data.skills.find(s => s.id === id)?.cost ?? 0), 0);
  if (campaign.points + refund < RESPEC_COST) return 'Resetting skills costs one skill point.';
  campaign.points += refund - RESPEC_COST;
  campaign.totalEarned -= RESPEC_COST;
  campaign.skills = [];
  return null;
}

/**
 * Mission rewards are threshold indices, never a counter increment per attempt.
 * Reapplying any result therefore cannot claim an already claimed reward.
 */
export function finishMission(campaign: Campaign, battle: BattleState, data: GameContent): {
  victory: boolean; score: number; reward: number; missionId: string;
} {
  const mission = data.missions.find(m => m.id === battle.missionId);
  if (!mission) throw new Error('Cannot finish an unknown mission.');
  if (!battle.ended || battle.winner === null) throw new Error('The battle has not finished.');
  if (!isMissionUnlocked(campaign, mission.id, data)) throw new Error('Cannot reward a locked mission.');
  const victory = battle.winner === 0;
  const own = battle.factions[0];
  // The simulation owns kill diminishing returns, first-capture points and
  // the one-time preservation/efficiency/victory completion bonuses.
  num(own.score, 'battle.factions[0].score', 0, 1e9);
  const score = Math.floor(own.score);
  const rewardScore = victory ? score : Math.floor(score * .5);
  const record = campaign.records[mission.id] ?? { bestScore: 0, claimed: [], victory: false };
  record.bestScore = Math.max(record.bestScore, score);
  record.victory ||= victory;
  let reward = 0;
  mission.thresholds.forEach((threshold, index) => {
    if (rewardScore >= threshold && (victory || index < 2) && !record.claimed.includes(index)) {
      record.claimed.push(index);
      reward++;
    }
  });
  record.claimed.sort((a, b) => a - b);
  campaign.records[mission.id] = record;
  campaign.points += reward;
  campaign.totalEarned += reward;
  return { victory, score, reward, missionId: mission.id };
}

type Obj = Record<string, unknown>;
function fail(path: string, message: string): never { throw new Error(`Invalid save at ${path}: ${message}`); }
function obj(value: unknown, path: string, keys?: string[]): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail(path, 'expected an object');
  const result = value as Obj;
  for (const key of Object.keys(result)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) fail(path, 'unsafe key');
    if (keys && !keys.includes(key)) fail(`${path}.${key}`, 'unknown field');
  }
  return result;
}
function list(value: unknown, path: string, max = 10_000): unknown[] {
  if (!Array.isArray(value) || value.length > max) fail(path, `expected an array of at most ${max} entries`);
  return value;
}
function num(value: unknown, path: string, min = 0, max = 1e12, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) fail(path, 'number outside valid range');
  return value;
}
function int(value: unknown, path: string, min = 0, max = 1e12): number { return num(value, path, min, max, true); }
function str(value: unknown, path: string, max = 160): string {
  if (typeof value !== 'string' || !value.length || value.length > max) fail(path, 'expected a nonempty string');
  return value;
}
function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'expected a boolean');
  return value;
}
function choice<T extends string | number>(value: unknown, values: readonly T[], path: string): T {
  if (!values.includes(value as T)) fail(path, 'unknown value');
  return value as T;
}
function nullableSide(value: unknown, path: string): void { if (value !== null) choice(value, [0, 1], path); }
function unique(values: unknown[], path: string): void { if (new Set(values).size !== values.length) fail(path, 'duplicate entries'); }
function idList(value: unknown, ids: Set<string>, path: string, max = 10_000): string[] {
  const values = list(value, path, max).map((v, i) => str(v, `${path}[${i}]`));
  unique(values, path);
  values.forEach(v => { if (!ids.has(v)) fail(path, `unknown reference ${v}`); });
  return values;
}
function dictionary(value: unknown, path: string, validate: (v: unknown, p: string, key: string) => void, max = 10_000): Obj {
  const values = obj(value, path);
  if (Object.keys(values).length > max) fail(path, 'too many entries');
  for (const [key, v] of Object.entries(values)) {
    str(key, path);
    validate(v, `${path}.${key}`, key);
  }
  return values;
}

/** Strict validation also verifies progression conservation and every state field. */
export function validateSave(value: unknown, data: GameContent): SaveData {
  const root = obj(value, 'save', ['version', 'savedAt', 'campaign', 'battle']);
  choice(root.version, [1], 'version');
  int(root.savedAt, 'savedAt', 0, 8.64e15);
  const campaign = obj(root.campaign, 'campaign', ['version', 'records', 'points', 'skills', 'selectedEra', 'tutorial', 'totalEarned', 'language', 'difficulty']);
  choice(campaign.version, [1], 'campaign.version');
  const missions = new Map(data.missions.map(m => [m.id, m]));
  const skillDefs = new Map(data.skills.map(s => [s.id, s]));
  const skills = idList(campaign.skills, new Set(skillDefs.keys()), 'campaign.skills', data.skills.length);
  const points = int(campaign.points, 'campaign.points', 0, 10_000);
  const earned = int(campaign.totalEarned, 'campaign.totalEarned', 0, 10_000);
  int(campaign.selectedEra, 'campaign.selectedEra', 0, data.eras.length - 1);
  bool(campaign.tutorial, 'campaign.tutorial');
  if (campaign.language !== undefined) choice(campaign.language, ['en', 'ar'], 'campaign.language');
  if (campaign.difficulty !== undefined) choice(campaign.difficulty, ['relaxed', 'standard', 'veteran'], 'campaign.difficulty');
  let rewardCount = 0;
  const records = dictionary(campaign.records, 'campaign.records', (v, path, id) => {
    const mission = missions.get(id);
    if (!mission) fail(path, 'unknown mission');
    const record = obj(v, path, ['bestScore', 'claimed', 'victory']);
    const score = int(record.bestScore, `${path}.bestScore`, 0, 1e9);
    const victory = bool(record.victory, `${path}.victory`);
    const claimed = list(record.claimed, `${path}.claimed`, mission.thresholds.length).map((n, i) => int(n, `${path}.claimed[${i}]`, 0, mission.thresholds.length - 1));
    unique(claimed, `${path}.claimed`);
    for (let i = 0; i < claimed.length; i++) {
      if (claimed[i] !== i) fail(`${path}.claimed`, 'threshold rewards must form an ordered prefix');
      if (!victory && (claimed[i] >= 2 || mission.thresholds[claimed[i]] > Math.floor(score * .5))) fail(path, 'invalid defeat reward');
      if (mission.thresholds[claimed[i]] > score) fail(path, 'reward exceeds best score');
    }
    rewardCount += claimed.length;
  }, data.missions.length);
  // A record can exist only if all earlier missions were won.
  const ordered = [...data.missions].sort((a, b) => a.era - b.era || a.index - b.index);
  for (let i = 1; i < ordered.length; i++) {
    if (records[ordered[i].id] && !(records[ordered[i - 1].id] as Obj | undefined)?.victory) fail('campaign.records', 'progress exists beyond a locked mission');
  }
  for (const id of skills) {
    const skill = skillDefs.get(id)!;
    if (!skill.prerequisites.every(p => skills.includes(p))) fail('campaign.skills', 'missing skill prerequisite');
    if (!skillAvailable(campaign as unknown as Campaign, skill, data)) fail('campaign.skills', 'era-specific skill precedes era unlock');
  }
  const cost = skills.reduce((sum, id) => sum + skillDefs.get(id)!.cost, 0);
  if (points + cost !== earned) fail('campaign.points', 'points plus purchases must equal the net earnings ledger');
  if (earned > INITIAL_POINTS + rewardCount) fail('campaign.totalEarned', 'earnings exceed the initial grant and claimed rewards');
  if (root.battle !== null) validateBattle(root.battle, data, campaign as unknown as Campaign);
  // Return a detached JSON snapshot. It cannot mutate the validated caller object later.
  return structuredClone(value) as SaveData;
}

function validateBattle(value: unknown, data: GameContent, campaign: Campaign): void {
  const b = obj(value, 'battle', ['version', 'missionId', 'seed', 'tick', 'time', 'paused', 'units', 'factions', 'strongholds', 'structures', 'fog', 'ai', 'events', 'nextId', 'winner', 'ended', 'aiSides', 'difficulty', 'aiGraceUntil']);
  choice(b.version, [1], 'battle.version');
  const missionId = str(b.missionId, 'battle.missionId');
  const mission = data.missions.find(m => m.id === missionId);
  if (!mission || !isMissionUnlocked(campaign, missionId, data)) fail('battle.missionId', 'unknown or locked mission');
  const width = mission.map[0].length;
  const height = mission.map.length;
  const defs = new Map(data.eras[mission.era].units.map(u => [u.id, u]));
  // Purchased historical skills remain in the serialized roster; the engine
  // applies only persistent skills and skills belonging to the active era.
  const skillIds = new Set(data.skills.map(s => s.id));
  const holdIds = new Set(mission.strongholds.map(h => h.id));
  const tick = int(b.tick, 'battle.tick', 0, 1e9);
  const time = num(b.time, 'battle.time', 0, 1e8);
  if (b.difficulty !== undefined) choice(b.difficulty, ['relaxed', 'standard', 'veteran'], 'battle.difficulty');
  if (b.aiGraceUntil !== undefined) num(b.aiGraceUntil, 'battle.aiGraceUntil', 0, time + 90);
  int(b.seed, 'battle.seed', 0, 0xffffffff);
  if (b.seed !== mission.seed) fail('battle.seed', 'seed differs from the authored mission');
  bool(b.paused, 'battle.paused');
  int(b.nextId, 'battle.nextId', 1, 1e12);
  nullableSide(b.winner, 'battle.winner');
  const ended = bool(b.ended, 'battle.ended');
  if (ended !== (b.winner !== null)) fail('battle.winner', 'winner and end state disagree');
  const aiSides = list(b.aiSides, 'battle.aiSides', 2);
  aiSides.forEach((s, i) => choice(s, [0, 1], `battle.aiSides[${i}]`));
  unique(aiSides, 'battle.aiSides');
  const vec = (v: Obj, path: string): void => { num(v.x, `${path}.x`, -.5, width); num(v.y, `${path}.y`, -.5, height); };
  const allIds = new Set<string>();
  let maximumId = 0;
  const entity = (value: unknown, path: string): string => {
    const id = str(value, path);
    if (allIds.has(id)) fail(path, 'duplicate entity identifier');
    allIds.add(id);
    const generated = /^[uljrs](\d+)$/.exec(id);
    if (generated) maximumId = Math.max(maximumId, Number(generated[1]));
    return id;
  };
  const unitRef = (value: unknown, path: string): string => {
    const id = str(value, path);
    if (!defs.has(id)) fail(path, 'unit does not belong to this era');
    return id;
  };
  const order = (value: unknown, path: string): void => {
    const o = obj(value, path, ['kind', 'x', 'y', 'target']);
    choice(o.kind, ['move', 'attack', 'defend', 'capture', 'rally', 'build', 'ability'], `${path}.kind`);
    vec(o, path);
    if (o.target !== undefined) str(o.target, `${path}.target`);
  };
  const units = list(b.units, 'battle.units', 4096);
  units.forEach((value, i) => {
    const path = `battle.units[${i}]`;
    const u = obj(value, path, ['id', 'owner', 'defId', 'hp', 'facing', 'orders', 'route', 'cooldown', 'abilityCooldown', 'formation', 'group', 'slot', 'status', 'lastHit', 'stuck', 'targetId', 'x', 'y']);
    entity(u.id, `${path}.id`); choice(u.owner, [0, 1], `${path}.owner`);
    const def = defs.get(unitRef(u.defId, `${path}.defId`))!;
    vec(u, path); num(u.hp, `${path}.hp`, .000001, def.hp * 10); num(u.facing, `${path}.facing`, -1e6, 1e6);
    list(u.orders, `${path}.orders`, 256).forEach((o, n) => order(o, `${path}.orders[${n}]`));
    list(u.route, `${path}.route`, width * height * 2).forEach((v, n) => vec(obj(v, `${path}.route[${n}]`, ['x', 'y']), `${path}.route[${n}]`));
    num(u.cooldown, `${path}.cooldown`, 0, 1e6); num(u.abilityCooldown, `${path}.abilityCooldown`, 0, 1e6);
    choice(u.formation, ['line', 'column', 'wedge', 'spread', 'shield'], `${path}.formation`);
    maximumId = Math.max(maximumId, int(u.group, `${path}.group`, 0, 1e12)); int(u.slot, `${path}.slot`, 0, 4096);
    choice(u.status, ['idle', 'walk', 'attack', 'hurt', 'defend'], `${path}.status`);
    num(u.lastHit, `${path}.lastHit`, -1e12, 1e12); num(u.stuck, `${path}.stuck`, 0, 1e8);
    if (u.targetId !== undefined) str(u.targetId, `${path}.targetId`);
  });
  const factions = list(b.factions, 'battle.factions', 2);
  if (factions.length !== 2) fail('battle.factions', 'expected two factions');
  factions.forEach((value, i) => {
    const path = `battle.factions[${i}]`;
    const f = obj(value, path, ['resources', 'spent', 'earned', 'baseCapacity', 'reserveCapacity', 'lines', 'reserves', 'autoDeploy', 'skills', 'cooldowns', 'kills', 'score', 'lost', 'captured', 'damageDealt']);
    for (const key of ['resources', 'spent', 'earned', 'score', 'damageDealt']) num(f[key], `${path}.${key}`, 0, 1e9);
    for (const key of ['baseCapacity', 'reserveCapacity', 'lost']) int(f[key], `${path}.${key}`, 0, 1e6);
    bool(f.autoDeploy, `${path}.autoDeploy`);
    const factionSkills = idList(f.skills, skillIds, `${path}.skills`, data.skills.length);
    if (i === 0 && !factionSkills.every(id => campaign.skills.includes(id))) fail(`${path}.skills`, 'battle contains an unpurchased player skill');
    if (Math.abs((f.resources as number) + (f.spent as number) - (f.earned as number) - mission.resources[i]) > .001) fail(path, 'battle resource ledger does not balance');
    dictionary(f.cooldowns, `${path}.cooldowns`, (v, p, key) => {
      const pointKey = /^(pending:(?:rally|recon|volley):|reveal:)([^,]+),([^,]+)$/.exec(key);
      if (pointKey) {
        num(Number(pointKey[2]), `${p}.x`, -.5, width);
        num(Number(pointKey[3]), `${p}.y`, -.5, height);
      }
      const pending = pointKey?.[1].startsWith('pending:') || /^deploy:(?:r\d+|all)$/.test(key);
      if (!pending && !pointKey && !['rally', 'recon', 'volley'].includes(key) && !/^tower:[a-zA-Z0-9_-]+$/.test(key)) fail(p, 'unknown cooldown key');
      if (pending) choice(v, [-1], p); else num(v, p, 0, 1e6);
    }, 4096);
    dictionary(f.kills, `${path}.kills`, (v, p, key) => { unitRef(key, p); int(v, p, 0, 1e8); }, defs.size);
    idList(f.captured, holdIds, `${path}.captured`, holdIds.size);
    const lines = list(f.lines, `${path}.lines`, 16);
    if (!lines.length) fail(`${path}.lines`, 'at least one production line is required');
    lines.forEach((value, n) => {
      const p = `${path}.lines[${n}]`;
      const line = obj(value, p, ['id', 'queue', 'blocked']); entity(line.id, `${p}.id`); bool(line.blocked, `${p}.blocked`);
      list(line.queue, `${p}.queue`, 1000).forEach((value, j) => {
        const q = `${p}.queue[${j}]`;
        const job = obj(value, q, ['id', 'unitId', 'remaining', 'total', 'started']);
        entity(job.id, `${q}.id`); unitRef(job.unitId, `${q}.unitId`);
        const total = num(job.total, `${q}.total`, .000001, 1e6);
        num(job.remaining, `${q}.remaining`, 0, total); const started = bool(job.started, `${q}.started`);
        if (j > 0 && started) fail(q, 'only the head of a production line can be training');
        if (!started && job.remaining !== job.total) fail(q, 'unstarted training has partial progress');
      });
    });
    list(f.reserves, `${path}.reserves`, 4096).forEach((value, n) => {
      const p = `${path}.reserves[${n}]`;
      const reserve = obj(value, p, ['id', 'unitId']); entity(reserve.id, `${p}.id`); unitRef(reserve.unitId, `${p}.unitId`);
    });
  });
  const holds = list(b.strongholds, 'battle.strongholds', mission.strongholds.length);
  if (holds.length !== mission.strongholds.length) fail('battle.strongholds', 'incomplete strongholds');
  const actualHoldIds: string[] = [];
  holds.forEach((value, i) => {
    const path = `battle.strongholds[${i}]`;
    const h = obj(value, path, ['id', 'name', 'kind', 'owner', 'capacity', 'reward', 'vision', 'x', 'y', 'progress', 'capturing']);
    const id = entity(h.id, `${path}.id`); actualHoldIds.push(id);
    const original = mission.strongholds.find(c => c.id === id);
    if (!original) fail(path, 'unknown stronghold');
    for (const key of ['name', 'kind', 'capacity', 'reward', 'vision', 'x', 'y'] as const) {
      if (h[key] !== original[key]) fail(`${path}.${key}`, 'immutable mission data differs');
    }
    nullableSide(h.owner, `${path}.owner`); nullableSide(h.capturing, `${path}.capturing`); num(h.progress, `${path}.progress`, 0, 100);
    if (h.capturing !== null && h.capturing === h.owner) fail(path, 'owner cannot capture its own stronghold');
    if (h.kind === 'main' && h.owner !== original.owner && (!ended || h.owner === null || h.owner !== b.winner)) fail(path, 'main-stronghold capture must agree with the battle result');
  });
  unique(actualHoldIds, 'battle.strongholds');
  list(b.structures, 'battle.structures', 2048).forEach((value, i) => {
    const path = `battle.structures[${i}]`;
    const s = obj(value, path, ['id', 'owner', 'hp', 'maxHp', 'kind', 'built', 'x', 'y']);
    entity(s.id, `${path}.id`); choice(s.owner, [0, 1], `${path}.owner`); vec(s, path);
    const hp = num(s.maxHp, `${path}.maxHp`, 1, 1e6); num(s.hp, `${path}.hp`, .000001, hp);
    choice(s.kind, ['barrier', 'tower'], `${path}.kind`); num(s.built, `${path}.built`, 0, 1);
  });
  const memories = (value: unknown, path: string): void => {
    dictionary(value, path, (v, p, key) => {
      const memory = obj(v, p, ['id', 'defId', 'seen', 'x', 'y']);
      if (memory.id !== key) fail(p, 'memory identifier differs from dictionary key');
      unitRef(memory.defId, `${p}.defId`); vec(memory, p); num(memory.seen, `${p}.seen`, 0, time + .11);
    }, 4096);
  };
  const fog = list(b.fog, 'battle.fog', 2);
  if (fog.length !== 2) fail('battle.fog', 'expected fog for both factions');
  fog.forEach((value, i) => {
    const path = `battle.fog[${i}]`; const f = obj(value, path, ['visible', 'explored', 'memory']);
    const visible = list(f.visible, `${path}.visible`, width * height);
    const explored = list(f.explored, `${path}.explored`, width * height);
    if (visible.length !== width * height || explored.length !== width * height) fail(path, 'fog dimensions differ from map');
    visible.forEach((v, n) => { bool(v, `${path}.visible[${n}]`); if (v && explored[n] !== true) fail(path, 'visible terrain must be explored'); });
    explored.forEach((v, n) => bool(v, `${path}.explored[${n}]`)); memories(f.memory, `${path}.memory`);
  });
  const ai = list(b.ai, 'battle.ai', 2);
  if (ai.length !== 2) fail('battle.ai', 'expected both faction plans');
  ai.forEach((value, i) => {
    const path = `battle.ai[${i}]`; const a = obj(value, path, ['nextDecision', 'objective', 'mode', 'lastKnown', 'decisions', 'nextRecruitAt']);
    num(a.nextDecision, `${path}.nextDecision`, 0, 1e12);
    if (a.nextRecruitAt !== undefined) num(a.nextRecruitAt, `${path}.nextRecruitAt`, 0, 1e12);
    if (a.objective !== null && !holdIds.has(str(a.objective, `${path}.objective`))) fail(path, 'unknown strategic objective');
    choice(a.mode, ['defend', 'expand', 'attack', 'recover'], `${path}.mode`);
    memories(a.lastKnown, `${path}.lastKnown`); int(a.decisions, `${path}.decisions`, 0, 1e9);
  });
  const eventIds: number[] = [];
  list(b.events, 'battle.events', 10_000).forEach((value, i) => {
    const path = `battle.events[${i}]`; const e = obj(value, path, ['id', 'tick', 'kind', 'owner', 'text', 'target', 'x', 'y']);
    eventIds.push(int(e.id, `${path}.id`, 0, 1e12)); int(e.tick, `${path}.tick`, 0, tick);
    choice(e.kind, ['hit', 'death', 'shot', 'capture', 'deploy', 'ability', 'alert', 'build'], `${path}.kind`);
    choice(e.owner, [0, 1], `${path}.owner`); vec(e, path);
    if (e.text !== undefined) str(e.text, `${path}.text`, 500);
    if (e.target !== undefined) vec(obj(e.target, `${path}.target`, ['x', 'y']), `${path}.target`);
  });
  unique(eventIds, 'battle.events');
  maximumId = Math.max(maximumId, ...eventIds);
  if ((b.nextId as number) <= maximumId) fail('battle.nextId', 'ID cursor would reuse an existing entity or event identifier');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB is unavailable. Use a supported browser with local storage enabled.')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onerror = () => reject(request.error ?? new Error('Could not open local saves.'));
    let blocked = false;
    request.onblocked = () => { blocked = true; reject(new Error('Local save upgrade is blocked by another game tab. Close the other tab and retry.')); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

let pendingSave: Promise<void> = Promise.resolve();
export function saveGame(data: SaveData): Promise<void> {
  // Capture immediately so Worker updates cannot change the in-flight snapshot.
  let snapshot: SaveData;
  try { snapshot = validateSave(data, content); }
  catch (error) { return Promise.reject(error); }
  const operation = pendingSave.catch(() => undefined).then(async () => {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        const store = transaction.objectStore(STORE);
        const previous = store.get('current');
        previous.onsuccess = () => {
          if (previous.result !== undefined) {
            try { store.put(validateSave(previous.result, content), 'previous'); }
            catch { /* Preserve a still-valid backup instead of replacing it with corruption. */ }
          }
          store.put(snapshot, 'current');
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error('Local save failed.'));
        transaction.onabort = () => reject(transaction.error ?? new Error('Local save was interrupted; the previous save is preserved.'));
      });
    } finally { db.close(); }
  });
  pendingSave = operation;
  return operation;
}

export async function loadGame(): Promise<SaveData | null> {
  await pendingSave.catch(() => undefined);
  const db = await openDatabase();
  try {
    const [current, previous] = await new Promise<[unknown, unknown]>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const store = transaction.objectStore(STORE);
      const current = store.get('current');
      const previous = store.get('previous');
      transaction.oncomplete = () => resolve([current.result, previous.result]);
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not read local saves.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Local save read was interrupted.'));
    });
    for (const value of [current, previous]) {
      if (value === undefined) continue;
      try { return validateSave(value, content); } catch { /* Try the last valid committed snapshot. */ }
    }
    if (current !== undefined || previous !== undefined) throw new Error('Both local save snapshots are invalid. Import a valid exported save to recover.');
    return null;
  } finally { db.close(); }
}

export function exportSave(data: SaveData): Blob {
  return new Blob([JSON.stringify(validateSave(data, content), null, 2)], { type: 'application/json' });
}

export async function importSave(file: File, data: GameContent): Promise<SaveData> {
  if (file.size <= 0 || file.size > MAX_SAVE_BYTES) throw new Error('Save files must contain between 1 byte and 16 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); }
  catch { throw new Error('The selected file is not valid JSON.'); }
  return validateSave(parsed, data);
}
