# MASTER IMPLEMENTATION PROMPT
## Complete Browser-Based Isometric RTS: Eight Eras, Forty Battles

### 1. Your Role and Mission

Act as a senior game development team consisting of a technical director, RTS game designer, gameplay programmer, AI engineer, TypeScript architect, 2D visual artist, UI/UX designer, level designer, balance designer, and QA engineer.

Your mission is to **design, implement, test, debug, and deliver one complete, production-ready, single-player real-time strategy game** based on every requirement in this specification.

This must be a real playable game, not a prototype, mockup, proof of concept, vertical slice, scaffold, or partial demonstration.

**Non-negotiable scope:**
- Eight distinct civilization eras.
- Exactly five playable battles per era.
- Exactly forty complete, individually designed missions.
- A functional player-versus-computer RTS combat system.
- All progression, AI, combat, economy, formation, capture, production, skill, save, visual, and interface systems described below.
- Complete original game assets and animations.
- Fully functional browser build, source code, documentation, and tests.

Complete the entire project within the assigned implementation task. You may internally organize the engineering work into milestones, but **do not treat an intermediate milestone as the final deliverable, and do not ask the user to commission each missing feature separately**.

Never silently omit a required subsystem to reduce implementation complexity. Never misrepresent incomplete features as completed.

If an execution or environment limitation prevents full completion, report the exact limitation and unfinished requirements truthfully rather than claiming success.

### 1.1 Multi-Agent Execution & Collaboration

Execute this project through a coordinated team of specialized AI agents whenever multi-agent orchestration is supported by the execution environment.

The agents must collaborate as one development team, working in parallel on independent tasks and sequentially on tasks with dependencies.

Recommended specialized roles include:
- **Lead Architect / Orchestrator Agent:** Owns the overall architecture, coordinates tasks, manages dependencies, enforces requirements, and validates integration.
- **Game Design & Balancing Agent:** Designs military systems, progression, units, skills, missions, and balancing rules.
- **Simulation & Gameplay Agent:** Implements the independent simulation engine, combat, economy, formations, pathfinding, and tactical commands.
- **Strategic AI Agent:** Implements hierarchical enemy AI, decision-making, tactical reasoning, and economic behavior.
- **Visual Art & Animation Agent:** Produces professional original graphics, character animations, environments, icons, effects, and other visual assets.
- **UI/UX Agent:** Implements campaign screens, the HUD, skill trees, production panels, minimap, and gameplay interaction.
- **Content & Level Design Agent:** Builds and validates the complete eight-era, forty-mission campaign.
- **QA & Testing Agent:** Performs automated tests, browser tests, integration checks, performance analysis, and bug verification.

#### Mandatory Collaboration Rules
1. Use parallel execution when tasks can proceed independently without conflicting dependencies.
2. Use sequential execution when an agent requires verified outputs from another agent.
3. Require agents to communicate requirements, interface contracts, dependencies, implementation changes, and integration issues.
4. Maintain a shared implementation plan, task ownership registry, and integration checklist.
5. Establish stable TypeScript contracts and data schemas before parallel implementation of dependent systems.
6. Avoid duplicate work, conflicting changes, and incompatible subsystem implementations.
7. Integrate completed work continuously and validate cross-system compatibility.
8. Escalate unresolved architectural conflicts to the Lead Architect Agent.
9. Assign discovered defects to the relevant agent and require verification after correction.
10. Require all agents to follow the same approved game specification and Definition of Done.

The Lead Architect Agent remains responsible for ensuring that the final deliverable is one fully integrated, coherent, playable project.

Do not create separate disconnected prototypes or partially compatible projects.

If the environment does not support independent AI agents, use the most capable available equivalent orchestration and clearly disclose the limitation. Do not falsely claim that multiple agents were created or collaborated.

---

### 2. Game Identity and Core Experience

Create a polished, original, 2D isometric strategy game about military conflict and civilization development, progressing from prehistoric societies to a futuristic space civilization.

The player commands individual soldiers or groups, recruits units from a main stronghold, captures strategically important subsidiary strongholds, and ultimately wins by capturing the enemy's main stronghold.

Combat must emphasize:
- Active tactical control.
- Military specialization and counterplay.
- Positioning and terrain.
- Formation management.
- Intelligent enemy decisions.
- Scouting, stealth, and incomplete information.
- Resource efficiency.
- Long-term civilization development.

The game is exclusively **single-player against an AI-controlled opponent**. Multiplayer, accounts, paid services, external AI APIs, and online backends are not required.

The initial release must be **silent**, with no mandatory music, voiceover, or sound effects. Prioritize responsive visuals and clear feedback.

The final visual identity must be **beautiful, clean, consistent Minimalist 2D Art**, not pixel art, photorealism, or generic placeholder graphics.

### 3. Campaign Structure

Implement exactly eight eras in this historical progression:
1. Hunter-Gatherer / Prehistoric Era.
2. Bronze Age.
3. Classical Antiquity.
4. Medieval Age.
5. Gunpowder Age.
6. Industrial Age.
7. Modern / Advanced Military Age.
8. Space Age.

Each era must contain exactly five missions. The fifth mission is a special era-finale battle with a distinct map and elevated tactical challenge.

Total: **40 playable missions**.

Each mission must have a meaningful, handcrafted strategic identity and a complete level configuration. Avoid repeating the same battle with merely changed colors, names, or larger enemy numbers.

Maintain one core victory condition throughout the campaign: **gradually capture the enemy's main stronghold**.

Special missions may introduce different terrain, military pressures, enemy strategies, strategic structures, and tactical constraints, but must not replace the fundamental victory condition.

Track unlocked eras and missions persistently.

Allow players to replay completed missions without losing campaign progress or duplicating previously earned skill rewards.

### 4. Strongholds and Victory Rules

Each battle includes:
- One player main stronghold.
- One enemy main stronghold.
- Multiple subsidiary strongholds, with mission-dependent numbers and positions.

All units are recruited at their side's **main stronghold only**. Subsidiary strongholds must not become ordinary recruitment centers.

Strongholds may be captured, recaptured, defended, and contested.

Capture occurs gradually through military occupation of a capture zone.

Capture speed must depend on relevant factors, including:
- Number of qualifying occupying units.
- Unit specialization.
- Unit capabilities or skills.
- Active defenders and contesting forces.

Defenders must be able to resist and reverse capture progress according to defined, balanced rules.

Captured subsidiary strongholds may provide:
- One-time economic rewards.
- Military or strategic bonuses.
- Additional army capacity.
- Visibility or map-control advantages.
- Other clearly specified mission-dependent advantages.

**Do not implement passive resource generation.** Economic bonuses from captures must be compatible with the no-passive-income rule, such as one-time capture rewards.

Subsidiary stronghold capacity bonuses last only while the stronghold is controlled.

Capturing the enemy main stronghold wins the battle.

An army can also be defeated when it has no remaining viable soldiers or reserves and lacks the resources or production capability to field replacements. Account for training queues and reserves when evaluating defeat, rather than incorrectly ending a battle while usable reinforcements exist.

AI and player must obey the same capture, resource, recruitment, and defeat rules.

### 5. Units, Combat, and Tactical Roles

Implement genuine military role specialization.

Units must differ meaningfully in their:
- Health.
- Damage.
- Attack speed.
- Attack range.
- Movement speed.
- Armor and defenses.
- Training time.
- Recruitment resource cost.
- Army capacity cost.
- Visibility.
- Tactical abilities.
- Preferred targets.
- Counters and vulnerabilities.

Include meaningful categories appropriate to each era, such as frontline combatants, ranged attackers, defensive specialists, scouts, stealth units, siege or anti-fortification specialists, and military engineers where historically or technologically appropriate.

These examples are illustrative, not a restriction to a fixed roster.

**Unit count and composition must vary between eras and missions**, influenced by progression and unlocked skills.

Some units unlock automatically through campaign progression. Others require the appropriate skill-tree unlock.

When the player enters a new era, the previous era's unit roster is replaced by the new era's roster. Do not allow continuous recruitment of obsolete era units.

Each era must introduce genuine tactical differences in military equipment, range, mobility, technology, abilities, or combat interactions. Avoid simply multiplying the statistics of old units under new names.

Design role-based counterplay with strengths and weaknesses, ensuring that expensive units do not automatically defeat every cheaper specialist.

Include visual feedback for attacks, hits, deaths, targeting, and relevant status effects.

Combat calculations belong to the simulation engine, not the renderer.

### 6. Unit Control and RTS Input

Implement traditional desktop RTS controls:
- Left-click to select an individual unit or eligible game object.
- Drag-selection rectangle to select multiple units.
- Right-click to issue contextual move, attack, or interaction commands.
- Keyboard shortcuts for control groups, formations, abilities, and command management.
- Additive selection and control-group assignment.
- Independent orders for different groups.
- Clear visual selection indicators.

Orders must function for individual units and selected groups.

Implement editable sequential command queues supporting:
- Moving.
- Attacking.
- Defending.
- Capturing.
- Rallying or regrouping.
- Other unit-specific actions.

Players must be able to inspect, append, change, reorder where appropriate, and cancel planned orders.

Units may defend themselves when threatened and should resume their existing queued plans when that threat is resolved, unless the order is no longer valid.

Make contextual commands predictable and prevent ambiguous mouse input from unintentionally overwriting planned orders.

Support right-click commands issued through the interactive minimap where appropriate.

### 7. Tactical Pause

Implement a true tactical pause.

When activated:
- Simulation time freezes for both parties.
- Combat, movement, production, AI decision progression, capture progression, and cooldown progression stop.
- Camera movement, selection, UI interactions, and editing command queues remain available.
- Planned movement paths and tactical order icons become easier to inspect.
- Players may reorganize selected groups and their formations.
- No hidden enemy information is revealed.

When resumed, the simulation executes the updated orders according to normal game rules.

Use a clear but subtle Minimalist tactical-planning visual mode.

### 8. Military Formations

Implement usable group formations with tactical consequences.

Provide basic formations from the beginning and unlock advanced formations through skill progression.

Different formations should meaningfully influence:
- Spacing.
- Unit protection.
- Maneuverability.
- Exposure to ranged damage.
- Defensive efficiency.
- Offensive concentration.
- Movement through constricted terrain.

Formations must work with queued orders and tactical pause.

Groups should adapt temporarily when navigating bridges, narrow pathways, and obstacles, then reconstruct the desired formation when space permits.

Formations must not be cosmetic only.

### 9. Economy and Resource Rules

Battle resources and persistent skill points are completely separate.

**Battle resources:**
- Reset for every mission attempt.
- Have a mission-defined starting budget.
- Are earned immediately from defeating enemy units and capturing strategic objectives.
- Are used to recruit units and build eligible defensive structures.
- Must not be generated passively over time.

Enemy-unit resource rewards may depend on unit class or value and must be balanced.

The enemy AI operates under identical economic restrictions.

The economy should encourage active territorial control and tactical victories, not passive waiting.

Balance each mission so that resources, recruitment costs, army capacity, and possible recovery paths create meaningful decisions.

### 10. Recruitment, Army Capacity, and Reserves

Implement a complete army production system.

Every unit consumes a defined amount of army capacity. Different units may have different capacity costs.

Army capacity may be expanded through skill upgrades.

Some subsidiary strongholds temporarily increase army capacity while controlled.

When a stronghold is lost and army capacity decreases below the current deployed army usage:
- Existing deployed units remain on the battlefield.
- They retain normal fighting ability.
- Additional deployment is blocked until sufficient capacity becomes available.
- Do not arbitrarily kill or weaken existing soldiers.

Units are trained at the main stronghold through time-based queues.

Initially there is one training production line. Additional parallel lines can be unlocked through skills.

Training time varies by unit type and can be improved through progression.

Each production line has its own independent processing state.

Cancelling a queued unit before training starts provides a **100% resource refund**.

Cancelling a unit after training has begun provides a **partial refund**. Define and balance the exact percentage during implementation; apply the same rule to AI and player.

Completed units that cannot be deployed due to army capacity restrictions may wait inside the main stronghold in a **limited reserve**, rather than being lost.

Reserve capacity is separately limited and can be expanded by skills.

Implement player-selectable manual or automatic reserve deployment.

Implement adjustable reserve deployment priorities.

When a high-priority reserve unit cannot fit available deployment capacity, temporarily consider lower-priority units that do fit, **without permanently reordering the player's priority list**.

If a completed unit cannot deploy and cannot enter the reserve because it is full, block only the affected production line. Other lines should continue operating if they are able to make progress.

Automatically resume a blocked line once its capacity restriction is resolved.

The full system must function in both simulation and production UI, and be covered by tests.

### 11. Terrain, Structures, and Tactical Construction

Maps must include varied terrain relevant to military tactics, appropriate to their eras and missions.

Potential terrain types include forests, hills, open ground, rivers, bridges, defensive positions, and constrained routes.

Terrain should influence relevant gameplay properties such as:
- Movement speed.
- Path accessibility.
- Visibility and line of sight.
- Cover and defense.
- Combat range effectiveness.
- Tactical positioning.

Implement interactive strategic features, including appropriate combinations of bridges, gates, barriers, watchtowers, and defensive cover.

These must have actual gameplay effects.

Specialized engineer or construction units may build new defensive structures during battle.

Construction consumes finite battle resources and can be improved through relevant skills.

Give constructed structures suitable functionality, restrictions, and vulnerability.

Maintain consistent functionality for AI and player.

### 12. Fog of War, Scouting, and Stealth

Implement symmetrical fog of war for both sides.

Use three map-visibility states:
1. Never discovered: obscured.
2. Previously discovered but not currently visible: terrain memory is displayed dimly.
3. Currently visible: live information is visible.

Previously discovered terrain must not reveal current enemy locations outside vision.

Vision comes from eligible friendly units, controlled strongholds, and specialist scouting units.

Scouts may provide extended vision or detection against hidden forces.

Implement stealth and ambush-capable units appropriate to the era.

Detection must obey defined visibility and counter-stealth rules.

The enemy AI may reason only from its legitimately available knowledge and its own memory of previously observed information.

Never let AI read live player unit positions through the authoritative game state when those units are hidden by fog of war.

Visual fog effects must not leak hidden information.

Minimap visibility must follow the exact same rules.

### 13. Global Tactical Abilities

Implement player-level tactical abilities independent of individual soldiers, where unlocked or appropriate.

These must have authentic strategic effects, balanced costs, cooldowns, targeting constraints, and era/skill requirements.

The AI must have equitable access to abilities within the same rules.

Support manual unit abilities as well as automatic or passive abilities according to their definitions.

Do not replace gameplay abilities with purely decorative visual effects.

### 14. Civilization Progression and Skill Trees

Maintain two distinct categories of skill progression:

**Persistent civilization skills**
- Survive across era transitions.
- Improve long-term capability.
- Influence recruitment, command, army capacity, reserve capacity, technology, or similar systems.

**Era-specific skills**
- Are associated with the current era.
- Unlock or improve relevant era military capabilities.
- Do not result in obsolete unit recruitment persisting into a new era.

Create branching skill trees with prerequisite chains.

Players may invest in multiple branches concurrently.

Support respec at a defined skill-point or progression cost, balanced by implementation.

Skills must include both:
- Numerical improvements to gameplay.
- Unlocks of meaningful new units, abilities, formations, or systems.

Allow players to inspect skill trees during combat, but **skill purchasing and respec occur only between missions**.

Provide a visual, zoomable, pannable Minimalist skill-tree interface with clear connections, requirements, locked states, purchased states, and available points.

### 15. Performance Scoring and Rewards

Do not use star ratings.

Implement a numerical **Cumulative Performance Score** for each battle.

Score sources must include meaningful combinations of:
- Enemy units defeated, weighted by actual combat value or threat.
- Strategic strongholds captured.
- Tactical achievements.
- Military efficiency.
- Economic efficiency.
- Army preservation.
- Relevant mission accomplishments.

Use defined and balanced scoring formulas, documented in game data.

The score contribution from repeatedly defeating large numbers of the **same enemy unit type** must diminish progressively during the battle.

This anti-farming mechanism affects **performance score only**. It must not reduce the regular battle-resource rewards earned from kills.

Convert performance into persistent skill-point rewards through mission-specific achievement thresholds.

Track the highest legitimately achieved threshold per mission.

Replaying a mission may improve the player's best score and unlock previously unearned threshold rewards, but may **never grant the same persistent reward twice**.

On mission defeat:
- Preserve already-earned campaign progress and purchased skills.
- Award an appropriately balanced partial reward based on genuine performance.
- Allow retrying the mission.
- Prevent repeat-loss or intentional-failure farming by tracking already claimed thresholds or using equivalent capped reward logic.

The system must be transactional and robust against reload or save-file restoration accidentally duplicating rewards.

Display concise end-of-battle information:
- Victory or defeat.
- Total performance score.
- Newly earned rewards.
- Continue or retry actions.

Do not require a complex results dashboard, star breakdown, or extensive statistical charts.

### 16. Adaptive Enemy AI

Implement an autonomous, hierarchical, rule-compliant AI opponent.

Use four cooperating decision layers:

**Strategic AI**
- Select overall objectives.
- Evaluate threat to the main stronghold.
- Decide attack, defense, expansion, recapture, or strategic repositioning.

**Tactical AI**
- Allocate forces to objectives.
- Evaluate unit counters and terrain.
- Select formations.
- Perform flanking, scouting, defensive maneuvers, and ambush responses.

**Economic AI**
- Spend finite resources intelligently.
- Recruit appropriate unit mixes.
- Handle production queues and reserves.
- Prioritize investments and fortifications.

**Unit AI**
- Execute assigned behavior.
- Navigate.
- Fight.
- Defend itself.
- Return to orders when appropriate.

Use Utility AI for ranking strategic or tactical actions, supported by behavior trees or state machines for execution.

AI must adapt to player behavior and game conditions rather than following a fixed attack script.

Difficulty must rise through better decision-making, better use of legal information, stronger tactical combinations, and mission design.

Do not grant the AI hidden resources, illicit map vision, faster production, increased damage, or rules that do not apply to the player.

No LLM, external AI API, network call, account, or paid service may be required for opponent decision-making.

### 17. Mission Design and Difficulty

Develop exactly forty complete mission configurations.

Provide a meaningful progression of tactics and challenge within every era.

Each mission needs:
- An individual map configuration.
- Player and enemy starting positions.
- Subsidiary strongholds and their roles.
- Initial resources and applicable army limits.
- Era-appropriate available unit rosters.
- Relevant terrain challenges.
- Appropriate AI tactical priorities.
- Mission-specific balancing parameters.
- A distinct tactical concept.

Mission five of every era is a unique finale.

Difficulty must escalate without breaking player/AI rule parity.

Use handcrafted base maps with **limited, controlled procedural variation**.

Procedural changes must:
- Preserve strategic objectives.
- Remain fair to both sides.
- Respect valid navigation and visibility.
- Avoid creating impossible maps.
- Not invalidate meaningful performance comparisons.

Use reproducible seeds as appropriate and persist the generated map state for saved battles.

Do not create one generic mission generator and merely label its output as forty finished scenarios.

### 18. Visual Identity

Use an original, polished **Minimalist 2D Art** direction.

The game must use a 2D isometric or 2.5D presentation. Do not switch to a fully 3D rendering architecture.

Characteristics:
- Elegant, simple, recognizable shapes.
- Restrained but attractive palettes.
- Cohesive environments and architecture.
- Clearly identifiable military unit classes.
- Expressive, fluid character movement.
- Readable combat animations.
- Clean silhouettes at multiple zoom levels.

Unit detail should remain visually restrained, with richness coming from animation and interaction rather than excessive surface decoration.

Create distinct era-specific architecture, weapons, structures, and environments while maintaining a recognizable overarching art direction.

Each faction has a consistent identifying color throughout the game.

Era palettes vary appropriately.

Do not rely only on color for differentiating unit types; use silhouettes, equipment, icons, or other built-in visual cues.

Use actual finished assets or original programmatically authored vector-based artwork suitable for a polished game. Generic rectangles, temporary icons, missing images, unfinished placeholder sprites, and decorative representations of nonexistent gameplay are not acceptable.

### 18.1 Professional Asset Generation, Animation & Visual Quality

The game must achieve a distinctive, original, professional visual identity while respecting the approved Minimalist 2D Art direction.

Minimalism must mean deliberate artistic simplicity, visual consistency, and excellent readability. It must not become an excuse for generic shapes, unfinished placeholder artwork, poor animation, or low-quality user interfaces.

#### AI-Assisted Visual Asset Creation

Assign a dedicated Visual Art & Animation Agent, or an equivalent specialized capability, to create and refine the required visual assets.

When appropriate, use available AI image-generation, illustration, vector-design, sprite-generation, animation, or visual-design tools to produce original assets.

These assets may include:
- Character and military unit designs for all eight eras.
- Animation frames, sprite sheets, and directional character views.
- Main and subsidiary strongholds.
- Military buildings, fortifications, bridges, gates, and watchtowers.
- Isometric terrain tiles, forests, rivers, roads, and environmental props.
- Weapons, projectiles, shields, and military equipment.
- Combat effects, particles, explosions, smoke, and energy effects.
- UI panels, HUD elements, buttons, icons, and interface illustrations.
- Skill-tree icons and technology illustrations.
- Campaign and mission-selection visuals.
- Backgrounds, decorative elements, and transition effects.
- Any additional graphical resources needed to produce a visually polished game.

AI-generated visuals must be refined, normalized, and prepared for actual game integration.

A generated image alone is not sufficient if the game requires sprite animation, a transparent asset, a reusable icon, separate layers, or another technical format.

#### Visual Production Pipeline
1. Establish a coherent art direction, palette system, proportions, lighting rules, and design language before large-scale asset creation.
2. Define consistent character silhouettes and visual classification for military roles.
3. Create era-specific visual variations while preserving the game's overarching identity.
4. Use image-generation tools when they improve the quality or originality of the required assets.
5. Remove unnecessary backgrounds and prepare transparency where appropriate.
6. Convert visual outputs into properly sized sprites, sprite sheets, texture atlases, SVG assets, or optimized game-ready files.
7. Ensure isometric proportions, camera angles, scale, and asset alignment remain consistent.
8. Produce smooth and expressive animations that accurately communicate gameplay actions.
9. Optimize assets for browser performance and WebGL rendering.
10. Test every visual asset inside the actual game, not only as an isolated image.
11. Refine visual inconsistencies, unclear icons, weak animations, and unfinished graphical elements before delivery.

#### Professional Quality Standards

The final game must have:
- A distinctive and cohesive visual identity.
- Professionally designed Minimalist interfaces.
- High-quality, original isometric environments.
- Recognizable and visually differentiated military units.
- Smooth, expressive combat and movement animations.
- Attractive but controlled combat visual effects.
- Clear selection, command, health, capture, and production feedback.
- Consistent visual quality across all eight eras.
- No missing, broken, or temporary placeholder artwork.

The Visual Art Agent and UI/UX Agent must coordinate closely to ensure that graphical assets and interface components follow the same design language.

Do not use an image as a substitute for an interactive interface. UI windows, buttons, panels, and menus must remain fully functional and programmatically interactive.

If a new visual-generation tool or skill is required but not installed, follow Section 23.1 and obtain user approval before installing or enabling it.

All generated and externally sourced assets must have appropriate usage rights and must be included in the delivered project.

The goal is not merely a technically functioning game. The goal is a complete strategy game with **memorable, polished, professional-grade visual presentation and gameplay animation**.

### 19. Combat Animation and Effects

Animate units meaningfully during:
- Idle behavior.
- Walking and running.
- Turning.
- Attacking.
- Receiving damage.
- Defending.
- Using abilities.
- Dying or being defeated.
- Formation transitions.

Provide readable era-specific combat effects:
- Dust, arrows, spears, and physical impacts in early eras.
- Metal strikes, smoke, projectiles, and explosions in later historical eras.
- Energy weapons, futuristic impacts, and related effects in advanced eras.

Effects should be visually satisfying but controlled.

Automatically reduce decorative particle density or detail at large zoom-out levels or when scenes are congested.

Visual optimization must not alter combat calculations.

Animate strongholds through visible changes in flags, gates, recruitment, siege, occupation, and control ownership.

Use smooth, quick Minimalist UI transitions.

**Do not create special cinematic sequences for era transitions.**

Proceed directly to the next era with updated content and a concise informative summary.

### 20. Camera, HUD, and Minimap

Implement large isometric maps exceeding the viewport dimensions.

Camera features:
- Smooth panning.
- Zoom in and out.
- Appropriate bounds.
- Quick navigation to selected units and strongholds.
- Fullscreen support.

Use a clean, fixed-layout contextual HUD.

Core resource and army information remains visible.

Contextual controls change depending on the selected object:
- Units: combat orders, formations, abilities, queued actions.
- Main stronghold: recruitment and reserves.
- Subsidiary stronghold: control and strategic status.
- Nothing selected: uncluttered battle view.

The HUD layout must be consistent and fixed. Players may open, close, and expand relevant panels, but do not provide arbitrary drag-and-drop HUD rearrangement or independent element sizing.

Use contextual health bars:
- On damage.
- On selection.
- On mouse hover.
- With clear danger indicators for critically injured units.

Implement an **interactive minimap** that:
- Displays legally visible units and strongholds.
- Supports moving the camera.
- Supports issuing suitable movement commands.
- Displays important strategic alerts.
- Shows camera location.
- Respects fog of war.

Display ordered paths and action markers directly on the map when a unit or group is selected.

Make queued actions editable and visually distinguish the active action.

The game should have one coherent default visual presentation without additional user-adjustable accessibility themes, contrast presets, font-size settings, or HUD layout customization. Nevertheless, use readable defaults and understandable icons in the base design.

### 21. Production Interface

Selecting the player's main stronghold opens a compact contextual production panel.

The panel must be expandable and provide:
- Recruitable units.
- Unit costs and capacity requirements.
- Training progress.
- Training queues.
- Multiple production lines when unlocked.
- Recruitment cancellation.
- Army usage versus capacity.
- Reserve occupancy versus capacity.
- Manual or automatic deployment.
- Reserve deployment priority management.
- Explanation of blocked production lines.
- Active bonuses affecting production.

The panel must reflect the actual simulation state and update correctly.

Do not implement a decorative panel disconnected from recruitment logic.

### 22. Campaign and Results Interfaces

Provide a Minimalist campaign screen organized into **eight era tabs**.

Each era displays five mission cards.

Mission cards show:
- Locked/unlocked/completed state.
- Mission identity.
- Best numerical performance score.
- Replay availability.
- Clear identification of the era-finale mission.

The results screen should remain concise, showing victory or defeat, score, rewards, and appropriate next actions.

Provide integrated progressive tutorials introducing relevant mechanics during early gameplay.

Tutorial hints must be skippable and replayable.

Do not force the player to complete a long separate tutorial before playing.

### 23. Technology Stack

Implement the entire game as a desktop-oriented browser application using:
- **TypeScript** with strict typing.
- **Phaser** as the 2D game and rendering framework.
- **WebGL** for accelerated graphics.
- An independent deterministic fixed-timestep simulation core.
- **Web Workers** for simulation, AI, and computationally expensive tasks as appropriate.
- **IndexedDB** for persistent storage.
- **Service Worker and PWA** capabilities for offline operation.
- A modern build system suitable for a statically hosted production bundle.

Keep the authoritative simulation state separate from rendering.

Use a defined command interface between UI and simulation.

Use explicit, efficient data contracts for Worker communication.

The renderer should interpolate or otherwise smooth presentation between simulation snapshots where appropriate.

Keep AI decision frequency and pathfinding workload under control without compromising authoritative simulation accuracy.

Implement proper lifecycle management, resource cleanup, and error handling.

Avoid unnecessary dependencies, backend services, server-side databases, paid APIs, or permanent online requirements.

### 23.1 Tool & Skill Availability and Installation Approval

Before starting each major development activity, inspect the tools, plugins, skills, libraries, and capabilities available in the execution environment.

If a particular tool, plugin, skill, or specialized capability is not installed or available, and it would materially improve implementation quality or efficiency, explicitly request the user's approval before installing, enabling, or connecting it.

When requesting approval, specify:
- The exact tool, plugin, or skill name.
- Its intended purpose.
- Why it is needed or beneficial.
- Whether an already available alternative exists.
- Any relevant cost, permissions, security implications, or external service requirements.

**Never install, enable, or connect an additional tool or skill that requires approval without obtaining explicit user authorization first.**

Once approval is granted and the capability becomes available, incorporate it into the development workflow and inform the appropriate collaborating agents.

Do not request approval repeatedly for the same previously authorized tool.

Do not allow an unavailable optional tool to block unrelated development tasks. Continue with available capabilities wherever practical.

The tool-approval requirement is an explicit exception to the instruction not to interrupt implementation for routine milestone approvals.

If a required tool cannot be installed or enabled, report the limitation accurately and assess viable alternatives without silently reducing the approved game scope.

### 24. Pathfinding and Movement

Implement a hybrid group pathfinding system.

It must combine:
- Efficient strategic route planning.
- Local obstacle avoidance.
- Soldier-to-soldier collision management.
- Group coordination.
- Formation preservation when possible.
- Temporary formation relaxation in narrow passages.
- Automatic reformation after exiting constrained areas.

Units must navigate around strongholds, terrain barriers, rivers, and other obstacles.

Respect bridges, gates, and constructed defenses.

Avoid stuck units, oscillation, pathfinding loops, unnatural stacking, and severe congestion.

Provide recovery strategies when goals become inaccessible or terrain dynamically changes.

Support multiple simultaneous groups with independent orders.

Pathfinding must work with the authoritative fixed-timestep simulation.

### 25. Persistent Saving and Restoration

Implement automatic local saving using IndexedDB.

Persist campaign data including:
- Unlocked eras and missions.
- Completed missions.
- Best scores and claimed threshold rewards.
- Available skill points.
- Purchased skills.
- Persistent civilization upgrades.
- Relevant player preferences.

Persist complete active battle snapshots including:
- Generated mission/map seed or resolved map state.
- Unit positions, orientations, health, and statuses.
- Both factions' resources and army capacity.
- Stronghold ownership and capture progress.
- Recruitment queues and production line states.
- Reserves and deployment priorities.
- Current orders and command queues.
- Tactical ability cooldowns.
- Relevant terrain and defensive structures.
- Fog-of-war discovery history.
- AI planning state sufficient for faithful continuation.
- Simulation time and other necessary authoritative state.

Use versioned save schemas and validation.

Protect against incomplete or corrupted save writes using an atomic or transactional approach appropriate to IndexedDB.

Provide safe recovery from the last valid save where feasible.

Allow players to export a complete portable save file and import it later.

Validate imported files.

Prevent corrupted or duplicate progression rewards from invalid saves.

### 26. Offline Functionality

Build a fully functioning PWA.

The game must be able to run offline once the required files have been downloaded.

Support:
- Core application caching.
- Era-specific resource caching.
- Lazy loading as needed.
- An explicit option to download all eight eras' assets for fully offline play.
- Clear download progress and completion status.
- Cache versioning and safe updates.
- Consistent save behavior offline.

Do not claim complete offline readiness when assets needed for unvisited eras are still missing.

Ensure correct operation under HTTPS deployment and localhost development.

### 27. Data-Driven Content Architecture

Define eras, units, abilities, strongholds, skills, missions, maps, economic values, and balancing formulas in structured data independent of the simulation code.

Use JSON or an equivalent clearly structured format with runtime schema validation and TypeScript types.

Validate:
- All eight eras exist and are ordered correctly.
- Exactly forty missions exist.
- Every era has exactly five missions.
- Mission links and unlock conditions are valid.
- Every unit and skill reference resolves.
- Skill prerequisites are valid and do not produce unintended cycles.
- Era restrictions are consistent.
- Unit and economic values are within valid ranges.
- Missions have reachable objectives.
- Assets referenced by gameplay data exist.
- Every era contains meaningful military variation.

Do not hard-code mission-specific rules into rendering components.

Make content and balance values reviewable and editable.

### 28. Balancing Responsibilities

You are responsible for defining and balancing detailed numerical values.

This includes:
- Unit health, damage, armor, and attack speed.
- Range and movement.
- Unit counters.
- Recruitment cost and time.
- Army and reserve capacities.
- Production upgrades.
- Skill costs and benefits.
- Respec costs.
- Refund rates after started training.
- Capture rates.
- Resource rewards.
- Performance score weights.
- Diminishing score returns.
- Skill reward thresholds.
- AI tactical evaluation weights.
- Mission starting budgets and challenges.

Select coherent initial values, then refine using automated simulation and gameplay testing.

All values must obey the established qualitative rules.

Balance for multiple successful army compositions and skill-development strategies.

Avoid:
- Dominant units with no meaningful counter.
- Dead-end progression.
- Unwinnable mission configurations.
- Infinite or excessively profitable reward farming.
- Trivial difficulty escalation.
- AI resource cheating.
- Passive-resource loopholes.

Document core formulas and final balancing decisions.

### 29. Performance Requirements

Target:
- Approximately 60 FPS on representative mid-range desktop hardware in ordinary gameplay.
- At least approximately 30 FPS during heavy battles on the specified target class, where achievable.

Treat these as measurable engineering goals, not automatically satisfied claims.

Use:
- GPU-friendly asset organization.
- Texture atlases.
- Culling where appropriate.
- Object pooling where useful.
- Efficient animation updates.
- Controlled particle counts.
- Worker-based computation.
- Efficient AI scheduling.
- Managed pathfinding budgets.
- Adaptive visual quality under load.
- Asset loading and unloading policies.

Visual quality may adapt under load, but combat rules, simulation timing, tactical fairness, and authoritative gameplay logic must remain intact.

Avoid excessive allocations and memory leaks during long play sessions and repeated mission replays.

Record actual performance-test conditions and results.

### 30. Testing and QA

Build and run meaningful automated tests.

Required categories:

**Unit tests**
- Combat and damage.
- Resource transactions.
- Capture calculations.
- Recruitment and refunds.
- Capacity and reserve behavior.
- Skill progression.
- Score calculation and reward thresholds.

**Integration tests**
- Production line interactions.
- Formations and movement.
- Capture and recapture.
- Tactical pause.
- Skill effects.
- AI resource restrictions.
- Save and restore.
- Mission transition.

**Simulation tests**
- Headless AI-versus-AI battles.
- Diverse unit compositions.
- Multiple skill-build configurations.
- Difficult terrain and bottlenecks.
- Resource exhaustion and defeat.
- Main-stronghold capture.
- Pathfinding deadlocks.
- Mission viability.

**Content tests**
- Eight valid eras.
- Forty playable missions.
- Correct finale positions.
- Complete assets and data references.
- Distinct content and mission identities.

**End-to-end browser tests**
- Load the game.
- Start a campaign.
- Enter a mission.
- Recruit soldiers.
- Select units and issue commands.
- Pause and modify orders.
- Capture a subsidiary stronghold.
- Win or lose a mission.
- Review results.
- Save and reload.
- Replay completed missions.
- Use the skill tree.
- Use the offline functionality.

**Performance tests**
- Standard army encounters.
- High-density encounters.
- Extended play sessions.
- Repeated scene and mission transitions.
- Heavy AI/pathfinding scenarios.

Run browser-based tests using the available testing tools.

Fix discovered bugs rather than reporting them as successfully completed features.

Where a specific test cannot be executed in the environment, clearly label it unverified.

### 31. Final Deliverables

Deliver a complete, structured project containing:
1. All TypeScript source code.
2. Phaser game scenes and systems.
3. Independent simulation engine.
4. Worker architecture.
5. AI implementation.
6. All eight eras and forty playable missions.
7. Complete data definitions.
8. Original graphics, animations, effects, and interface assets.
9. Campaign, battle, production, skill, and results interfaces.
10. Persistent saving, import/export, and offline implementation.
11. PWA manifest and Service Worker.
12. Automated testing suite.
13. Production build.
14. Setup, build, test, and deployment instructions.
15. A final verification report.

Use a clear project structure with a README explaining how to install dependencies, run locally, build for production, execute tests, and deploy to HTTPS static hosting.

The game must not require a backend.

### 32. Mandatory Definition of Done

**The project is not complete unless all of the following conditions are satisfied:**

- [ ] The game starts and is playable in a supported desktop browser.
- [ ] All eight eras exist.
- [ ] Exactly forty missions are implemented and reachable.
- [ ] Each mission has meaningful gameplay and a distinct tactical identity.
- [ ] Each era contains authentic, differentiated military content.
- [ ] Both factions can recruit and control functional armies.
- [ ] The enemy AI autonomously manages military and economic decisions.
- [ ] AI respects the same resource and visibility rules as the player.
- [ ] Stronghold capture, contesting, recapture, and victory work.
- [ ] The secondary military-loss condition works.
- [ ] Terrain, scouting, stealth, and interactive structures influence gameplay.
- [ ] Formations, command queues, and tactical pause work.
- [ ] Recruitment, capacity, production lines, and reserves work.
- [ ] Skill trees and civilization progression work.
- [ ] Performance scores and rewards work without duplicate farming.
- [ ] Replaying completed missions works without resetting progress.
- [ ] Local autosave and active-battle restoration work.
- [ ] Save export and import work.
- [ ] PWA and offline asset downloading work.
- [ ] Minimalist graphics, animations, and effects are complete and coherent.
- [ ] HUD, minimap, production panel, campaign screen, and skill tree are fully interactive.
- [ ] No fake buttons, dead panels, placeholder units, or mocked gameplay remain.
- [ ] Data validation and essential automated tests pass.
- [ ] The production build succeeds.
- [ ] The game is tested in an actual browser.
- [ ] The final report accurately states verified functionality, measured performance, and unresolved limitations.

Do not mark unchecked items as complete.

### 32.1 Additional Mandatory Acceptance Criteria

- [ ] Specialized AI agents, or the best available equivalent orchestration, were coordinated to develop the project efficiently.
- [ ] Parallel and sequential task execution followed explicit dependency and integration rules.
- [ ] Agent responsibilities, subsystem contracts, and integration outcomes were verified.
- [ ] Missing tools or skills requiring installation or activation were not added without explicit user approval.
- [ ] Professional original visual assets were generated or created for every era and required gameplay system.
- [ ] Character animations, visual effects, icons, environmental graphics, and UI assets are consistent and production-ready.
- [ ] AI-generated assets were converted into usable game resources and integrated into functional systems.
- [ ] No static image is falsely presented as a working interactive UI component.
- [ ] The final game was visually reviewed and tested in the browser.
- [ ] All graphics and assets have appropriate usage rights and are included in the delivered project.

These criteria are mandatory additions to the existing Definition of Done. They do not replace or weaken any previously approved requirement.

### 33. Strict Implementation Rules

Do not:
- Reduce the game to one era or one sample level.
- Replace all combatants with generic identical units.
- Replace adaptive AI with a simple repeating attack timer.
- Fake tactical formations, skill effects, or fog of war.
- Claim procedural variations constitute forty complete handcrafted missions.
- Implement decorative interfaces whose controls have no gameplay effect.
- Use continuous passive resource generation.
- Give the AI hidden combat, economy, or visibility bonuses.
- Allow duplicate skill-point farming.
- Require external servers or AI APIs.
- Substitute cinematic era transitions for direct progression.
- Add an elaborate star-rating results system.
- Add arbitrary movable HUD customization.
- Require an iterative user approval process for individual implementation milestones.
- Claim tests were performed if they were not.

Do:
- Respect all requirements as one coherent design.
- Make reasonable, documented numerical balancing decisions.
- Use original, aesthetically consistent assets.
- Prefer robust systems over superficial visual demonstrations.
- Implement gameplay behavior before declaring a UI feature complete.
- Test the complete mission and progression loops.
- Preserve a clean, maintainable architecture.
- Deliver the full result and a truthful completion report.

### 34. Execution Instruction

Begin by constructing an internal dependency map of the game systems and a full implementation checklist.

Then implement the complete project, including all forty missions and their content, using the architecture and design rules above.

Run all available builds, automated tests, browser interaction tests, and balance checks. Debug failures and retest.

Treat implementation planning and internal milestones as your own engineering process. **The requested external deliverable is one complete, integrated game project**, not a sequence of partial prototype submissions.

When finished, provide:
- The working project and production build.
- Exact local run and deployment instructions.
- The test and verification results.
- A precise summary of implemented systems.
- An honest list of any remaining limitations.

**Success means a genuinely playable, complete, polished RTS game covering all eight eras and forty tactical missions, with functional systems, not merely code that compiles or a convincing-looking interface.**

Start implementation now.
