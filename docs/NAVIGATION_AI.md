# Navigation, terrain, and legal-information AI

The simulation owns movement and combat; these helpers supply deterministic route planning and orders. Coordinates are map cells centred on integer coordinates.

`findPath` uses weighted eight-neighbour A*. The heuristic is octile distance, traversal cost is segment length divided by destination terrain speed, and deterministic heap ties prefer forward progress. Diagonal movement never cuts the corner of an obstacle. Rivers and cliffs are impassable. Bridges and gates are explicit traversable cells. A completed friendly barrier has a wicket and permits friendly passage; enemy barriers block. Completed towers block both factions. Destroyed and unfinished structures do not obstruct movement. A unit standing on a newly completed structure may leave its cell. An unreachable goal returns the closest cell in the reachable component so capture-zone occupation and recovery remain possible.

Local separation preserves at least 20% forward velocity and biases head-on neighbours tangentially to reduce symmetric congestion. Formation offsets relax in passages detected by `isNarrow`; the simulation then restores the desired formation where space permits. Formation statistics give column +8% speed and +20% splash exposure, wedge +12% concentrated damage, spread -45% splash exposure with -4% speed/damage, and shield +3 armour with -26% speed/-10% damage. Line is the baseline. Wedge, spread, and shield require the formation skill.

Terrain combines movement, cover, vision, and additive range changes. Forest offers 22% cover at 78% movement and 72% vision. Hills offer +0.5 range and 18% vision at 88% movement. Cover positions offer 28% cover at 92% movement. Bridges and gates constrain movement to 88%; gates offer 12% cover. These values are exported from `terrainModifiers` and applied by the simulation.

`decideAI` deliberately accepts `ObservedState`, never `BattleState`. Its four cooperating layers are:

1. Strategic utility: visible home threats, contested objectives, finite-budget recovery, territorial expansion, and main-stronghold attack. A 0.13 persistence bonus prevents objective oscillation. Memory expires after 90 seconds and cannot create live enemy positions.
2. Tactical allocation: preserve a main force, detach a small scout group, flank an observed ranged concentration, choose unlocked formations against observed counters, and build only with a locally present engineer.
3. Economic planning: count deployed, queued, and reserve roles, recruit observed counters and mission-preferred composition, deduct a virtual budget for every emitted action, and limit queues to two jobs per line. No resources are granted to AI.
4. Unit execution: send the same typed commands the UI sends. Existing equivalent plans remain intact; combat, cooldowns, detection, and movement still run through ordinary simulation rules.

The caller schedules one decision per second, freezes the schedule during tactical pause, and constructs the sanitized observation. Global abilities require their skill effects. Unit abilities require ready cooldowns, a visible nearby opponent, and a legal finite budget. All cooldown ledgers and fog memories use simulation seconds.

Targeted verification lives in `tests/navigation.test.ts` and `tests/ai.test.ts`.
