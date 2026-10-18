# Simulation rules and balance

The Worker advances `stepBattle` at 10 Hz. Rendering, selection, camera movement and planning continue independently. State is JSON serializable, including navigation routes, both factions' fog, production, reserve priorities, ability timers and AI plans. No mechanic reads wall-clock time or unseeded randomness. An AI decision receives a deep-cloned observation of friendly objects, visible enemies, legitimate enemy memories and static mission information.

## Economy and production

- Missions supply the initial finite budget. There is no periodic income.
- A kill immediately awards `round(unit cost × 0.45)` resources, with a minimum of one.
- A stronghold pays its configured reward once per faction per attempt. Recapture does not pay that faction again.
- Recruitment occurs at the controlling faction's main stronghold. The current mission's era, roster and skill requirements restrict recruitment.
- A queued, unstarted job refunds 100%; a started job refunds 50%, rounded down. Each line processes independently. The processing flag becomes true on the first simulation tick, rather than when the command is entered.
- Default parallelism is one production line. Line skills add independent lines, capped at five. Training skills reduce duration multiplicatively by `max(0.35, 1 − summed improvement)`.
- Deployment requires sufficient active army capacity. Losing a capacity objective never reduces deployed soldiers' health, damage or armor.
- Completed jobs deploy automatically when enabled, otherwise enter the limited reserve. Full reserves block only the completing line. A blocked line resumes automatically once deployment or reserve space permits.
- Reserve deployment scans the existing priority list and skips a unit that cannot fit. Successfully deploying a lower-priority unit never reorders remaining reserves. Manual deployment is deferred during tactical pause.

## Combat, terrain and formations

Damage is at least one and combines the attacker's damage, role-counter multiplier, formation offense, skill offense, high ground and special strike multiplier; flat armor then reduces damage by `0.65 × armor`, and terrain cover reduces the result. Hill attacks gain 12%. Terrain also changes movement, vision and effective attack range. Cliffs block sight and repeated forest cells obstruct longer sight lines.

An initially concealed attack gains a 1.35 damage multiplier. Attacking or being hit reveals a stealth soldier for 1.5 seconds. Any adjacent enemy within 1.25 cells, eligible detectors, nearby controlled buildings or active reconnaissance can reveal stealth. Both factions use the same visibility function. Specialist unlock skills enable recruitment without adding an undocumented stat multiplier.

Line and column are initially available. Doctrine unlocks wedge, spread and shield. Wedge increases offense by 12%; spread reduces secondary splash damage to 55%; shield adds three armor at reduced speed and offense. Column travels faster but receives additional splash damage. Desired formation offsets rotate along the approach direction. Soldiers temporarily ignore spacing in narrow passages and reconstruct formation in open ground. Static building centers, impassable terrain, completed enemy barriers and completed towers obstruct routes. Local avoidance and route invalidation handle congestion and new obstacles.

Engineers construct a barrier for 35 resources (180 health, 8 seconds) or a tower for 65 (130 health, 12 seconds). Construction improvements reduce cost and time, bounded at 50%. Buildings cannot overlap existing structures or stronghold capture zones. An engineer must remain at the site to complete work; structures are vulnerable during construction. Completed towers provide vision and fire for 12 damage every 1.5 seconds at range five. Siege attacks deal 2.4 times normal damage to constructed defenses. Main strongholds are captured rather than destroyed.

## Capture and defeat

Soldiers within 2.15 cells contribute their configured capture weight, modified by capture skills. The difference between both sides' occupation power determines progress, bounded at 3.5 effective soldiers. Main capture speed is four percentage points per effective soldier per second; subsidiary speed is seven. Equal occupation contests progress. Defenders reverse hostile progress 20% faster; unoccupied progress decays two points per second. Opposing attackers first reverse existing progress before establishing their own.

Capturing the enemy main stronghold wins immediately. Military collapse also ends the battle, but a faction remains viable with deployed soldiers, deployable reserves, viable queued replacements, or sufficient resources, capacity and a production line to recruit an unlocked replacement.

## Abilities

All global abilities require their skill unlock. Rally costs 30 with a 45-second cooldown, healing nearby soldiers for 28% maximum health within four cells. Reconnaissance costs 25 with a 35-second cooldown, revealing a nine-cell radius for 12 seconds. Volley costs 45 with a 55-second cooldown and deals 45 damage in a 2.4-cell radius, modified by formation splash protection. Rally and volley require currently visible target locations. Reconnaissance can inspect unseen terrain. Tactical pause records planned abilities without advancing time or applying their effects.

Manual unit abilities cost four resources and have an 18-second cooldown: frontline and siege perform area strikes; ranged units make aimed attacks; guards recover 25% maximum health; scouts reveal a nine-cell area for eight seconds; stealth units perform double-damage strikes; engineers repair 40 structure health. An unusable ability consumes neither resources nor cooldown.

## Performance score

Every kill awards `round(cost × 3 / sqrt(1 + (previous same-type kills) / 3))` score. Diminishing returns affect score, while the resource reward remains constant. First captures award `reward × 3 + 180` score; main capture uses a 700-point bonus instead of 180.

At the end, each side gains 70% of its surviving army's health-weighted recruitment value and up to 250 efficiency points: `damage dealt / max(1, resources spent + losses × 10) × 20`. Victory awards 400 plus half a point per second remaining against the mission's par time. Final additions execute once, then the simulation freezes. Persistent campaign thresholds and their reward ledger are handled separately by the progression subsystem.
