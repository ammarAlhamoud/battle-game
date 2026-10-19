/** Shared, JSON-serializable contracts. Coordinates use map cells, not screen pixels. */
export type Side = 0 | 1;
export type Difficulty = 'relaxed' | 'standard' | 'veteran';
export type Role = 'frontline' | 'ranged' | 'guard' | 'scout' | 'stealth' | 'siege' | 'engineer';
export type Formation = 'line' | 'column' | 'wedge' | 'spread' | 'shield';
export type Terrain = '.' | 'f' | '^' | '~' | '=' | '#' | 'g' | 'c';
export interface Vec { x: number; y: number }
export interface UnitDef {
  id: string; era: number; name: string; role: Role; description: string;
  hp: number; damage: number; armor: number; attackTime: number; range: number;
  speed: number; cost: number; capacity: number; training: number; vision: number;
  capture: number; stealth: boolean; detection: number; splash: number;
  counters: Partial<Record<Role, number>>; skill?: string;
}
export interface EraDef {
  id: number; name: string; subtitle: string; years: string; color: string;
  ground: string; accent: string; description: string; art: string; units: UnitDef[];
}
export interface StrongholdConfig extends Vec {
  id: string; name: string; kind: 'main' | 'outpost' | 'watchtower' | 'gate';
  owner: Side | null; capacity: number; reward: number; vision: number;
}
export interface MissionDef {
  id: string; era: number; index: number; name: string; subtitle: string; briefing: string;
  concept: string; finale: boolean; seed: number; map: string[];
  strongholds: StrongholdConfig[]; resources: [number, number]; capacity: number;
  reserveCapacity: number; starting: [Role[], Role[]]; roster: Role[];
  ai: { aggression: number; expansion: number; defense: number; scout: number; preferred: Role[] };
  thresholds: number[]; parTime: number; tutorial?: string;
}
export type SkillEffect = 'capacity' | 'reserve' | 'lines' | 'training' | 'damage' | 'armor' | 'vision' | 'capture' | 'engineer' | 'stealth' | 'siege' | 'formations' | 'rally' | 'recon' | 'volley' | 'construction';
export interface SkillDef {
  id: string; name: string; description: string; era: number | null; cost: number;
  prerequisites: string[]; effect: SkillEffect; value: number; x: number; y: number;
}
export interface GameContent { eras: EraDef[]; missions: MissionDef[]; skills: SkillDef[] }
export type OrderKind = 'move' | 'attack' | 'defend' | 'capture' | 'rally' | 'build' | 'ability';
export interface Order extends Vec { kind: OrderKind; target?: string }
export interface Unit extends Vec {
  id: string; owner: Side; defId: string; hp: number; facing: number;
  orders: Order[]; route: Vec[]; cooldown: number; abilityCooldown: number;
  formation: Formation; group: number; slot: number; status: 'idle' | 'walk' | 'attack' | 'hurt' | 'defend';
  lastHit: number; stuck: number; targetId?: string;
}
export interface TrainingJob { id: string; unitId: string; remaining: number; total: number; started: boolean }
export interface ProductionLine { id: string; queue: TrainingJob[]; blocked: boolean }
export interface ReserveUnit { id: string; unitId: string }
export interface Faction {
  resources: number; spent: number; earned: number; baseCapacity: number; reserveCapacity: number;
  lines: ProductionLine[]; reserves: ReserveUnit[]; autoDeploy: boolean; skills: string[];
  cooldowns: Record<string, number>; kills: Record<string, number>; score: number;
  lost: number; captured: string[]; damageDealt: number;
}
export interface Stronghold extends StrongholdConfig { progress: number; capturing: Side | null }
export interface Structure extends Vec { id: string; owner: Side; hp: number; maxHp: number; kind: 'barrier' | 'tower'; built: number }
export interface Memory extends Vec { id: string; defId: string; seen: number }
export interface Fog { visible: boolean[]; explored: boolean[]; memory: Record<string, Memory> }
export interface AIPlan {
  nextRecruitAt?: number;
  nextDecision: number; objective: string | null; mode: 'defend' | 'expand' | 'attack' | 'recover';
  lastKnown: Record<string, Memory>; decisions: number;
}
export interface GameEvent extends Vec {
  id: number; tick: number; kind: 'hit' | 'death' | 'shot' | 'capture' | 'deploy' | 'ability' | 'alert' | 'build';
  owner: Side; text?: string; target?: Vec;
}
export interface BattleState {
  difficulty?: Difficulty; aiGraceUntil?: number;
  version: 1; missionId: string; seed: number; tick: number; time: number; paused: boolean;
  units: Unit[]; factions: [Faction, Faction]; strongholds: Stronghold[]; structures: Structure[];
  fog: [Fog, Fog]; ai: [AIPlan, AIPlan]; events: GameEvent[]; nextId: number;
  winner: Side | null; ended: boolean; aiSides: Side[];
}
export type Command =
  | { type: 'pause'; value: boolean }
  | { type: 'difficulty'; value: Difficulty }
  | { type: 'surrender'; side: Side }
  | { type: 'order'; side: Side; ids: string[]; order: Order; append?: boolean }
  | { type: 'editOrders'; side: Side; ids: string[]; orders: Order[] }
  | { type: 'formation'; side: Side; ids: string[]; formation: Formation }
  | { type: 'recruit'; side: Side; unitId: string; line?: number }
  | { type: 'cancelTraining'; side: Side; line: number; jobId: string }
  | { type: 'autoDeploy'; side: Side; value: boolean }
  | { type: 'deploy'; side: Side; reserveId?: string }
  | { type: 'reservePriority'; side: Side; ids: string[] }
  | { type: 'ability'; side: Side; ability: 'rally' | 'recon' | 'volley'; x: number; y: number }
  | { type: 'unitAbility'; side: Side; ids: string[] }
  | { type: 'build'; side: Side; ids: string[]; kind: 'barrier' | 'tower'; x: number; y: number };
export interface ProgressRecord { bestScore: number; claimed: number[]; victory: boolean }
export interface Campaign {
  language?: 'en' | 'ar';
  difficulty?: Difficulty;
  version: 1; records: Record<string, ProgressRecord>; points: number; skills: string[];
  selectedEra: number; tutorial: boolean; totalEarned: number;
}
export interface SaveData { version: 1; savedAt: number; campaign: Campaign; battle: BattleState | null }
export interface ObservedState {
  difficulty?: Difficulty; aiGraceUntil?: number;
  side: Side; time: number; tick: number; own: Unit[]; enemies: Unit[];
  strongholds: Stronghold[]; faction: Faction; enemyMemory: Record<string, Memory>;
  structures: Structure[]; map: string[]; mission: MissionDef; plan: AIPlan;
}
export type WorkerInput =
  | { type: 'init'; missionId: string; skills: string[]; restored?: BattleState; startPaused?: boolean; difficulty?: Difficulty }
  | { type: 'command'; command: Command }
  | { type: 'stop' }
  | { type: 'snapshot'; requestId?: number };
export type WorkerOutput = { type: 'state'; state: BattleState; requestId?: number } | { type: 'error'; message: string };
export interface Selection { units: string[]; stronghold: string | null }
/** Presentation-only targeting mode; never stored in a battle or portable save. */
export interface TacticalTarget { kind: 'rally' | 'recon' | 'volley' | 'barrier' | 'tower' | 'attack'; ids: string[] }
export interface BattleRenderer {
  setState(state: BattleState): void;
  setSelection(selection: Selection): void;
  focus(x: number, y: number): void;
  getViewport?(): Vec[];
  setTargeting?(target: TacticalTarget | null): void;
  setInputEnabled?(enabled: boolean): void;
  destroy(): void;
}
export interface RendererOptions {
  parent: HTMLElement; content: GameContent; mission: MissionDef;
  onSelect(selection: Selection, additive: boolean): void;
  onOrder(order: Order, append: boolean): void;
  onTarget?(point: Vec, append?: boolean): void;
}
