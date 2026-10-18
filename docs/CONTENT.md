# Eightfold — campaign content and initial balance

## Authorship and content contracts

The campaign contains eight ordered eras, exactly five missions per era, forty distinct 28 × 24 tactical maps, 51 unit definitions and 41 skill nodes. Mission IDs run from `e1m1` to `e8m5`; the fifth mission in each era is a finale. A victory always requires occupation of the enemy main stronghold, or the shared military exhaustion rule. Mission progression is sequential; previous victories remain replayable.

`src/content/missions.ts` holds forty separately authored tactical plans. A terrain stroke describes a specific rectangle of a specific terrain at specific coordinates. The resolver rasterizes those fixed plans, clears the two explicitly designed deployment yards and makes strategic structure cells passable. It performs no random map generation, coordinate mirroring, template rotation, difficulty substitution or automatic corridor repair. The seed exists for reproducible simulation state rather than for synthesizing mission layouts.

Terrain legend: `.` open, `f` forest, `^` hill, `~` impassable water/energy chasm, `=` bridge, `#` cliff/fortification, `g` traversable fortified gate and `c` defensive cover. Main yards center on `(4, 19)` and `(23, 4)`; each has five cells of deployment width. Art paths are relative to the static application base.

## Economic and progression decisions

- Both sides receive identical starting armies, budgets, army capacity, reserve capacity, available skills and rules. Difficulty changes tactical weights, terrain and composition preferences rather than hidden bonuses.
- A unit kill returns 45% of its recruitment cost to the victorious faction. A capture reward is a finite, first-capture payment tracked per faction per mission attempt. Recapture never pays that faction twice. There is no periodic income.
- Outposts provide +3 deployed capacity, gates +2 and watchtowers +1 while controlled. Watchtower vision is 9 cells; other sites grant 5–5.5. These control bonuses disappear upon losing the site without destroying existing troops.
- Subsidiary rewards range from 90 to 196 resources according to era, mission and structure category. Each map offers three or four subsidiaries so a player can choose between direct military pressure and finite economic expansion.
- Army capacity progresses from 16 to 32; reserves from 4 to 12. A basic soldier costs one capacity, heavy early guards two, and crewed siege/heavy mechanized units three. Small specialists may be strategically useful without winning direct cost-for-cost duels.
- Training lasts 3.6–13 seconds by class. Canceling an unstarted job refunds 100%; a started job refunds 50%. Baseline production has one line; Parallel training adds an independent second line.
- The campaign starts with three skill points, enough for Discipline and either Logistics or Fieldcraft. All era specialists cost one point and require one persistent branch. Every mission has three ascending score thresholds; each new threshold awards one point once, including capped partial-performance rewards on defeat. Respec refunds purchased skill cost less one skill point and is restricted to between battles.
- Global abilities are separately unlocked: Rally costs 30 resources with a 45 second cooldown and heals nearby allies by 28%; Recon costs 25 with a 35 second cooldown and temporarily reveals a selected area; Volley costs 45 with a 55 second cooldown and damages legally visible enemies around a visible target. A ready ability still cannot bypass its resource or visibility requirements.

## Combat and scoring formulas

All authoritative timings use a deterministic 0.1 second step. Before cover reduction, damage is `baseDamage × roleCounter × formationDamage × (1 + eraDamageUpgrade) × highGround × abilityMultiplier × ambushMultiplier − effectiveArmor × 0.65`, clamped to at least one after cover. Shooting downhill grants a 1.12 multiplier. An undetected stealth opener grants 1.35. Splash has a limited radius and a 0.55 secondary multiplier; dispersed formations reduce exposure.

Counter multipliers are explicit per unit: frontline counters scouts and stealth; ranged counters exposed frontline; guards counter ranged and scouts; scouts detect and counter stealth; stealth counters unsupported ranged and siege; siege counters heavy guards but struggles against fast scouts and infiltrators. Health, timing, reach, mobility, cost and capacity remain independent numbers rather than a common era multiplier.

Capture sums nearby qualifying unit power. Guards contribute 1.35, siege 1.75, scouts 0.72, engineers 1.15 and other roles 1.0, before skills. Opposing occupation subtracts from progress; net power caps at 3.5. Main capture advances at 4 points per second per net power and subsidiary capture at 7, with a 100 point target.

The kth kill of one unit definition adds `round(unitCost × 3 / sqrt(1 + (k − 1) / 3))` performance score. Economic kill rewards never diminish. A first capture adds `round(captureReward × 3 + 180)` score; the main adds 700. At battle end, surviving army value adds 70%, damage efficiency adds at most 250, and victory adds 400 plus an early-finish bonus of half a point per second below mission par time. Rewards use the persistent claimed-threshold ledger, so replay and defeat cannot duplicate a threshold.

## Every mission and its tactical identity

Budgets below are **per side**, independent of the equal starting army. Capacity excludes temporary controlled-site bonuses and persistent skill upgrades. All listed subsidiaries are individually placed; all have been checked for orthogonal terrain reachability from the home main stronghold.

### Era 1: Hunter–Gatherer / Prehistoric

Fast hunters contest wooded trails. Short-range weapons make scouts and disciplined spear screens decisive.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e1m1 · **The First Gathering** | A woodland center separates a short sheltered approach from a long exposed eastern flank. Early capture buys a second group rather than a compulsory frontal fight. | 480 / 16 / 4 | 280s / 300, 700, 1150 |
| e1m2 · **Reed Crossing** | A two-cell river forces deliberate bridge choice: the west route is short but wooded, the east is wide enough for a line and visible from a neutral hill. | 520 / 17 / 4 | 320s / 350, 800, 1300 |
| e1m3 · **Split Ridge** | A tall central ridge has two narrow gates and a long northern bypass. A guarding force can hold one gate while scouts expose the other route. | 550 / 18 / 5 | 350s / 400, 850, 1400 |
| e1m4 · **The Hidden Hearth** | A broad, broken woodland favors ambushers, but two clear firebreaks and an offset lookout reward active detection instead of blindly marching through cover. | 570 / 18 / 5 | 370s / 450, 950, 1500 |
| e1m5 · **Last Ember** · Finale | A T-shaped river creates three sectors, three crossings and a central beacon. Occupying the island exposes both final approaches, while the northern ford remains a viable flank. | 640 / 20 / 6 | 420s / 500, 1100, 1750 |

### Era 2: Bronze Age

Shield walls secure river crossings while composite bows and heavy rams create the first combined-arms assaults.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e2m1 · **Canals of Clay** | Parallel canals with staggered bridges force an S-shaped advance. A central market is both a capacity prize and a safe place to reform. | 620 / 19 / 5 | 360s / 400, 900, 1450 |
| e2m2 · **Salt Road** | An unobstructed central road favors ranged concentration, but separated flank objectives make a single slow shield ball surrender map control. | 650 / 20 / 5 | 340s / 450, 950, 1500 |
| e2m3 · **Three Riverbanks** | Two horizontal rivers with asymmetric crossings create three bands. The middle sanctuary is valuable but can be bypassed via a long eastern route. | 680 / 21 / 6 | 420s / 500, 1050, 1650 |
| e2m4 · **The Copper Gate** | Two offset defensive walls form a layered assault puzzle. The lower gate is wide enough for a ram, while a longer northern gap rewards mobile forces. | 710 / 22 / 6 | 440s / 500, 1100, 1750 |
| e2m5 · **The Flood Crown** · Finale | A moated northeastern city has west and south bridge entrances, outside observation hills and a distant resource flank. The defender must choose which bridge to cover. | 790 / 24 / 7 | 480s / 600, 1250, 1950 |

### Era 3: Classical Antiquity

Slow legionary cores support fast cavalry screens, long-range artillery and field engineers.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e3m1 · **The Broken Forum** | Crossed roads through four unequal terrain quadrants reward splitting the army. The square controls direct travel, but all outer streets remain open. | 690 / 21 / 6 | 350s / 450, 950, 1500 |
| e3m2 · **Beneath the Aqueduct** | A horizontal escarpment with three differently sized archways rewards group-specific paths and reformation beyond the choke rather than repeated frontal congestion. | 720 / 22 / 6 | 380s / 500, 1050, 1650 |
| e3m3 · **Three Standards** | Three separated objectives support simultaneous fronts. The central one is exposed, the west is wooded and the east sits behind a quarry mouth. | 750 / 23 / 7 | 380s / 550, 1100, 1750 |
| e3m4 · **The Harbor Road** | An L-shaped coastline removes the southern/eastern shortcut. A narrow coastal causeway is quick but observed; a wide inland arc favors mobile cohorts. | 780 / 24 / 7 | 430s / 550, 1200, 1850 |
| e3m5 · **The Eagle Pass** · Finale | Offset vertical cliff layers create a defended middle pocket. Both gates have bypasses, so artillery pressure and a northern cavalry thrust are viable alternatives. | 850 / 26 / 8 | 490s / 650, 1350, 2100 |

### Era 4: Medieval Age

Armored infantry hold gates; longbows, mounted scouts and siege engines contest fortified ground.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e4m1 · **Arrows over Heather** | Two offset bow hills overlook an open diagonal valley. Woodland cover and an undefended eastern margin provide alternatives to climbing directly under fire. | 740 / 22 / 6 | 370s / 500, 1000, 1600 |
| e4m2 · **Two Bridges of Alder** | Two narrow horizontal waterways have offset paired bridges. The island outpost is exposed from both banks and is best taken with synchronized supporting forces. | 780 / 23 / 7 | 410s / 550, 1100, 1750 |
| e4m3 · **The Greenwood Oath** | Three woodland bands channel units into parallel lanes; a broken cross-wall links those lanes at two gates. Sightline control matters more than numerical concentration. | 810 / 24 / 7 | 430s / 600, 1200, 1850 |
| e4m4 · **Between Two Keeps** | A full-height central curtain wall has three gates: two contestable gatehouses and a narrow center. Outer watchtowers make defender rotations legible. | 840 / 25 / 8 | 450s / 600, 1250, 1950 |
| e4m5 · **The Last Crown** · Finale | The northeast citadel combines a moat with an inner curtain wall. Two separate bridge-and-gate entries permit a coordinated split assault; the abbey supplies the outside staging area. | 930 / 28 / 8 | 520s / 700, 1400, 2200 |

### Era 5: Gunpowder Age

Powerful but slow-firing muskets need pikemen and prepared firing lines. Cannon punish packed ranks.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e5m1 · **The Powder Road** | A broad diagonal firing corridor is broken by cover islands. Pike screens can leapfrog between positions while dragoon patrols exploit the outer trees. | 790 / 23 / 7 | 370s / 500, 1050, 1650 |
| e5m2 · **The Marsh Battery** | Staggered marsh pools create three winding land corridors rather than a single bridge choke. A central hill has strong reach and poor escape options. | 830 / 24 / 7 | 410s / 550, 1150, 1800 |
| e5m3 · **Across the Gunline** | A river separates lowland deployment from northern firing hills. The western bridge avoids direct hill fire but adds distance; the eastern bridge offers speed with exposure. | 860 / 25 / 8 | 430s / 600, 1250, 1950 |
| e5m4 · **The Starward Fort** | Staggered bastions protect a northeastern enclosure while leaving two wide assault gates. Nearby outside cover allows disciplined advances and counterbattery positioning. | 900 / 26 / 8 | 470s / 650, 1300, 2050 |
| e5m5 · **A Republic of Smoke** · Finale | A stepped river and three crossings divide a chain of covered firing positions. Widely separated magazines reward simultaneous groups and deny a single perfect artillery position. | 980 / 28 / 9 | 510s / 750, 1500, 2300 |

### Era 6: Industrial Age

Accurate rifles, armored support and railway embankments reward suppression, cover and mobile reserves.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e6m1 · **Iron Junction** | A cover-marked rail cross links four open corridors, with short embankment walls preventing direct diagonal shortcuts. The center is fast but exposed from multiple directions. | 850 / 24 / 7 | 360s / 550, 1100, 1750 |
| e6m2 · **The Furnace Line** | Four staggered factory obstacles produce an urban weaving route with two long outside alleys. Corner cover supports infantry while artillery must choose its sightline. | 890 / 25 / 8 | 400s / 600, 1200, 1850 |
| e6m3 · **The Mountain Railway** | Three step-shaped cliff segments produce a winding diagonal corridor with separate outer bypasses. Capture points sit at turns rather than at a single central choke. | 920 / 26 / 8 | 440s / 650, 1300, 2050 |
| e6m4 · **Wire and Earth** | Two broken horizontal trench walls have deliberately misaligned openings. Open map edges remain viable flanks, trading distance for avoidance of the prepared center. | 950 / 27 / 9 | 460s / 650, 1350, 2100 |
| e6m5 · **The Foundry Crossing** · Finale | Two vertical channels have three offset crossings, intersecting a long rail bridge corridor. Factory ruins break artillery coverage and force a choice between central speed and safer outer crossings. | 1050 / 29 / 10 | 520s / 800, 1550, 2400 |

### Era 7: Modern Military

Recon detection, covert infiltration, long-range fire support and combat engineers form an interdependent army.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e7m1 · **The Glass Corridor** | Six urban blocks form long streets and short cross-alleys around a forested park. Stronghold positions encourage scouting intersections rather than blindly trading down one lane. | 930 / 25 / 8 | 370s / 600, 1200, 1850 |
| e7m2 · **The Sensor Coast** | A jagged coast compresses the east into a causeway with a short water crossing. An inland forest route avoids the sensor hill but takes longer to reach the main stronghold. | 980 / 26 / 8 | 420s / 650, 1300, 2050 |
| e7m3 · **The Silent Perimeter** | Dense forest corridors and broken walls create ambush pockets. The listening post overlooks the forest exit; a clear eastern road offers a visible but stealth-safe alternative. | 1010 / 27 / 9 | 440s / 700, 1400, 2150 |
| e7m4 · **Switchback Heights** | A stair-stepped cliff chain forces ground forces into a sequence of lateral turns. Deliberate gate cuts and two outside flanks keep the high-ground defense contestable. | 1050 / 28 / 9 | 480s / 700, 1450, 2250 |
| e7m5 · **Horizon Citadel** · Finale | Two offset fortified belts contain distinct northern and southern access gates. Separate sensor objectives and outside cover reward counter-reconnaissance and simultaneous pressure. | 1160 / 30 / 10 | 540s / 850, 1650, 2550 |

### Era 8: Space Age

Energy shields, phase scouts and orbital siege frames fight across constrained colony causeways.

| Mission | Tactical identity | Budget / capacity / reserve | Par / score thresholds |
|---|---|---|---|
| e8m1 · **The Landing Corridor** | Three staggered void pockets form an open northern lane, a protected winding center and a wide southern approach. Long beam ranges make visible crossing decisions essential. | 1030 / 26 / 8 | 380s / 650, 1300, 2000 |
| e8m2 · **The Relay Archipelago** | Three vertical chasms create four land bands with offset narrow and wide bridges. Two central relays let a divided army contest capacity while choosing its final crossing. | 1090 / 28 / 9 | 460s / 750, 1450, 2250 |
| e8m3 · **The Prism Basin** | A rectangular cliff basin has three nonaligned gates and a central tower. Units on the outer rim can threaten basin exits, creating encirclement and counter-encirclement opportunities. | 1140 / 29 / 9 | 480s / 800, 1550, 2400 |
| e8m4 · **The Dark Side** | Alternating crystal forests and defensive cover create a web of short ambush lanes. Two separated sensor relays reward anti-stealth coverage and coordinated independent groups. | 1180 / 30 / 10 | 490s / 850, 1650, 2500 |
| e8m5 · **The Last Orbit** · Finale | A broken cross-shaped void, offset bridges, an inner gate and four independent objectives combine the campaign’s lessons. No single siege position covers all crossings and both capital entrances. | 1300 / 32 / 12 | 600s / 1000, 1900, 2850 |

## Reviewable unit numbers

Range, speed, vision and detection use map cells; times use seconds. The first four roles are baseline recruits. Other roles require their matching current-era skill and must also be present in the mission roster.

| Era | Unit / role | HP / armor | Damage / attack time | Range / speed | Cost / capacity / train | Vision / detection |
|---|---|---|---|---|---|---|
| 1 | Flint spears · frontline | 108 / 2 | 18 / 1.15s | 1.2 / 1.58 | 48 / 1 / 4.5s | 5 / 1.6 |
| 1 | Sling hunters · ranged | 67 / 0 | 16 / 1.4s | 4.1 / 1.5 | 58 / 1 / 5.5s | 6 / 1.6 |
| 1 | Hide wardens · guard | 158 / 5 | 12 / 1.5s | 1.1 / 1.08 | 72 / 2 / 7s | 4.5 / 1.6 |
| 1 | Trail runners · scout | 58 / 0 | 11 / 0.9s | 1.15 / 2.65 | 44 / 1 / 3.6s | 8 / 6.5 |
| 1 | Reed stalkers · stealth | 76 / 0 | 26 / 1.3s | 1.25 / 1.92 | 84 / 1 / 7s | 5.6 / 1.6 |
| 2 | Bronze spears · frontline | 122 / 3 | 21 / 1.25s | 1.35 / 1.45 | 54 / 1 / 4.8s | 5 / 1.6 |
| 2 | Composite bows · ranged | 66 / 0 | 19 / 1.6s | 5.3 / 1.35 | 65 / 1 / 6s | 6 / 1.6 |
| 2 | Tower shields · guard | 184 / 7 | 13 / 1.55s | 1.15 / 0.98 | 84 / 2 / 7.5s | 4.6 / 1.6 |
| 2 | Chariot scouts · scout | 83 / 1 | 15 / 1.15s | 1.4 / 2.75 | 69 / 1 / 5.5s | 8.5 / 6.5 |
| 2 | Marsh raiders · stealth | 78 / 1 | 29 / 1.5s | 1.25 / 1.85 | 91 / 1 / 7.5s | 5.6 / 1.6 |
| 2 | Covered ram · siege | 235 / 8 | 42 / 3.2s | 1.6 / 0.65 | 135 / 3 / 11s | 4.2 / 1.6 |
| 3 | Legionaries · frontline | 145 / 5 | 22 / 1.3s | 1.25 / 1.35 | 66 / 1 / 5.5s | 5 / 1.6 |
| 3 | Javelin cohorts · ranged | 83 / 1 | 27 / 1.8s | 3.8 / 1.65 | 67 / 1 / 5.7s | 5.8 / 1.6 |
| 3 | Phalanx wardens · guard | 175 / 7 | 18 / 1.6s | 1.7 / 0.95 | 89 / 2 / 7.2s | 4.5 / 1.6 |
| 3 | Auxiliary cavalry · scout | 93 / 2 | 18 / 1.15s | 1.25 / 2.8 | 76 / 1 / 6s | 8.4 / 6.5 |
| 3 | Hill infiltrators · stealth | 75 / 1 | 31 / 1.4s | 1.3 / 1.95 | 90 / 1 / 7.5s | 6 / 1.6 |
| 3 | Scorpion battery · siege | 106 / 2 | 43 / 3.2s | 7 / 0.8 | 126 / 3 / 10s | 6 / 1.6 |
| 3 | Field artificers · engineer | 86 / 2 | 11 / 1.4s | 1.2 / 1.5 | 80 / 1 / 6.8s | 5.6 / 2.5 |
| 4 | Men-at-arms · frontline | 150 / 6 | 25 / 1.35s | 1.2 / 1.23 | 73 / 1 / 5.8s | 5 / 1.6 |
| 4 | Longbow companies · ranged | 68 / 0 | 23 / 1.85s | 6.4 / 1.24 | 74 / 1 / 6.2s | 6.8 / 1.6 |
| 4 | Pavise wardens · guard | 196 / 9 | 15 / 1.65s | 1.2 / 0.88 | 95 / 2 / 8s | 4.5 / 1.6 |
| 4 | Mounted outriders · scout | 96 / 2 | 19 / 1.2s | 1.3 / 2.9 | 80 / 1 / 6.2s | 8.6 / 6.5 |
| 4 | Woodland rangers · stealth | 79 / 1 | 25 / 1.55s | 3.5 / 1.86 | 99 / 1 / 8s | 6.2 / 1.6 |
| 4 | Trebuchet crews · siege | 103 / 1 | 48 / 3.6s | 7.6 / 0.62 | 147 / 3 / 12s | 6.1 / 1.6 |
| 4 | Castle sappers · engineer | 94 / 3 | 13 / 1.5s | 1.2 / 1.35 | 86 / 1 / 7s | 5.6 / 2.5 |
| 5 | Pike companies · frontline | 139 / 4 | 24 / 1.45s | 1.8 / 1.3 | 65 / 1 / 5.4s | 5.3 / 1.6 |
| 5 | Matchlock infantry · ranged | 79 / 1 | 37 / 2.45s | 6 / 1.19 | 84 / 1 / 7s | 6.4 / 1.6 |
| 5 | Cuirassier guards · guard | 186 / 8 | 20 / 1.7s | 1.25 / 1.08 | 102 / 2 / 8.5s | 5 / 1.6 |
| 5 | Dragoon patrols · scout | 88 / 1 | 20 / 1.6s | 3.5 / 2.65 | 87 / 1 / 6.5s | 8.7 / 6.5 |
| 5 | Field cannon · siege | 113 / 3 | 49 / 3.3s | 7.8 / 0.78 | 150 / 3 / 11.5s | 6.4 / 1.6 |
| 5 | Military pioneers · engineer | 95 / 2 | 15 / 1.6s | 2.6 / 1.42 | 91 / 1 / 7.1s | 5.8 / 2.5 |
| 6 | Rifle sections · frontline | 103 / 2 | 25 / 1.35s | 5.4 / 1.5 | 76 / 1 / 5.8s | 6.5 / 1.6 |
| 6 | Sharpshooters · ranged | 68 / 0 | 39 / 2.3s | 7.5 / 1.24 | 99 / 1 / 7.2s | 7.8 / 1.6 |
| 6 | Armored carriers · guard | 243 / 10 | 26 / 1.9s | 4.1 / 0.98 | 136 / 3 / 10s | 5.5 / 1.6 |
| 6 | Mounted signals · scout | 80 / 1 | 18 / 1.5s | 3.6 / 2.8 | 79 / 1 / 5.6s | 9 / 6.5 |
| 6 | Howitzer battery · siege | 104 / 2 | 56 / 3.9s | 8.4 / 0.7 | 160 / 3 / 12s | 6.9 / 1.6 |
| 6 | Railway engineers · engineer | 102 / 2 | 19 / 1.65s | 3.8 / 1.48 | 95 / 1 / 7.2s | 6.2 / 2.5 |
| 7 | Assault teams · frontline | 112 / 3 | 22 / 0.96s | 4.9 / 1.8 | 88 / 1 / 6.1s | 6.8 / 1.6 |
| 7 | Marksman teams · ranged | 74 / 1 | 41 / 2.1s | 7.9 / 1.3 | 111 / 1 / 7.7s | 8 / 1.6 |
| 7 | Shield vehicles · guard | 258 / 12 | 28 / 1.8s | 4.7 / 1.06 | 152 / 3 / 10.6s | 6 / 1.6 |
| 7 | Recon drones · scout | 65 / 1 | 12 / 1s | 3.8 / 3.1 | 83 / 1 / 5s | 10 / 6.5 |
| 7 | Covert teams · stealth | 86 / 2 | 35 / 1.35s | 3.7 / 2 | 121 / 1 / 8.2s | 6.7 / 1.6 |
| 7 | Rocket artillery · siege | 112 / 3 | 58 / 4s | 8.8 / 0.82 | 174 / 3 / 12.5s | 6.6 / 1.6 |
| 7 | Combat engineers · engineer | 114 / 3 | 21 / 1.45s | 4.2 / 1.62 | 105 / 1 / 7.3s | 6.8 / 2.5 |
| 8 | Pulse marines · frontline | 121 / 4 | 21 / 0.86s | 5.2 / 1.95 | 96 / 1 / 6.3s | 7 / 1.6 |
| 8 | Prism lancers · ranged | 77 / 1 | 45 / 2.1s | 8.2 / 1.35 | 124 / 1 / 8s | 8.4 / 1.6 |
| 8 | Aegis frames · guard | 279 / 13 | 27 / 1.65s | 3.2 / 1.1 | 166 / 3 / 11s | 6 / 1.6 |
| 8 | Phase skimmers · scout | 72 / 2 | 16 / 1.1s | 4.1 / 3.3 | 94 / 1 / 5.5s | 10.5 / 6.5 |
| 8 | Null operatives · stealth | 94 / 3 | 39 / 1.3s | 3.5 / 2.16 | 138 / 1 / 9s | 7 / 1.6 |
| 8 | Orbital walkers · siege | 154 / 5 | 64 / 4.1s | 9 / 0.86 | 192 / 3 / 13s | 7 / 1.6 |
| 8 | Fabricator teams · engineer | 119 / 4 | 22 / 1.4s | 4.3 / 1.7 | 115 / 1 / 7.7s | 7 / 2.5 |

## Skill-tree structure

Global skills occupy x=20–580, y=60–660. Era-specific branches use y=840 and y=1000 with prerequisite connections back to persistent logistics or fieldcraft. Coordinates are view-space pixels for the pannable and zoomable tree. Era-specific unlocks never make obsolete units recruitable in a later era.

| Skill | Era | Cost | Prerequisites | Gameplay effect |
|---|---|---|---|---|
| Common discipline · `discipline` | Persistent | 1 | — | Unlock wedge, spread and shield formations. Basic line and column are always available. |
| Army logistics · `logistics` | Persistent | 2 | discipline | Permanently add four deployed army capacity. |
| Fieldcraft · `fieldcraft` | Persistent | 2 | discipline | All current-era units gain one cell of vision. |
| Parallel training · `parallel-lines` | Persistent | 3 | logistics | Add a second independent production line at the main stronghold. |
| Organized reserves · `reserves` | Persistent | 2 | logistics | Add four reserve places without consuming deployed army capacity. |
| Rally signal · `rally` | Persistent | 2 | fieldcraft | Unlock a targeted rally: spend 30 battle resources to restore nearby allied health; 45 second cooldown. |
| Reconnaissance network · `recon` | Persistent | 2 | fieldcraft | Unlock a targeted vision pulse for 25 resources; 35 second cooldown. Detection still obeys vision. |
| Standardized drill · `drill` | Persistent | 3 | parallel-lines | Reduce training time by 15 percent for the current roster. |
| Expeditionary corps · `grand-logistics` | Persistent | 4 | reserves | Add six deployed army capacity beyond the logistics upgrade. |
| Coordinated volley · `volley` | Persistent | 3 | rally, recon | Unlock a visible-target area strike for 45 resources; 55 second cooldown. |
| Field fortification · `construction` | Persistent | 3 | recon | Engineers build barriers and towers for 20 percent fewer battle resources. |
| Occupation doctrine · `occupation` | Persistent | 3 | grand-logistics, volley | Increase all qualifying units’ capture contribution by 20 percent. |
| Reed camouflage · `e1-stealth` | 1 | 1 | fieldcraft | Unlock Reed stalkers, fragile close-range ambushers countered by Trail runners. |
| Layered hidework · `e1-hidework` | 1 | 1 | logistics | Prehistoric troops gain two armor against every hit. |
| Shared hunting trails · `e1-trails` | 1 | 2 | e1-stealth, e1-hidework | Prehistoric occupation contribution increases by 25 percent. |
| Marsh warfare · `e2-stealth` | 2 | 1 | fieldcraft | Unlock Marsh raiders for concealed attacks on bow companies. |
| Covered assault · `e2-siege` | 2 | 1 | logistics | Unlock the Covered ram: slow, durable and powerful at occupying fortifications. |
| Bronze lamination · `e2-shields` | 2 | 2 | e2-siege | Bronze Age troops gain two armor. |
| Palace musters · `e2-drill` | 2 | 2 | e2-stealth | Bronze Age training is 15 percent faster. |
| Hill auxiliaries · `e3-stealth` | 3 | 1 | fieldcraft | Unlock the Hill infiltrators for the current era. |
| Torsion engines · `e3-siege` | 3 | 1 | logistics | Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity. |
| Field artificers · `e3-engineer` | 3 | 1 | fieldcraft | Unlock this era’s engineer unit and resource-funded tactical construction. |
| Legionary drill · `e3-doctrine` | 3 | 2 | e3-siege, e3-engineer | Current-era units deal 12 percent more damage. |
| Forest charters · `e4-stealth` | 4 | 1 | fieldcraft | Unlock the Woodland rangers for the current era. |
| Counterweight engines · `e4-siege` | 4 | 1 | logistics | Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity. |
| Castle sappers · `e4-engineer` | 4 | 1 | fieldcraft | Unlock this era’s engineer unit and resource-funded tactical construction. |
| Tempered steel · `e4-doctrine` | 4 | 2 | e4-siege, e4-engineer | Current-era units gain two armor. |
| Gunnery schools · `e5-siege` | 5 | 1 | logistics | Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity. |
| Military pioneers · `e5-engineer` | 5 | 1 | fieldcraft | Unlock this era’s engineer unit and resource-funded tactical construction. |
| Measured volleys · `e5-doctrine` | 5 | 2 | e5-siege, e5-engineer | Current-era units deal 12 percent more damage. |
| Indirect fire · `e6-siege` | 6 | 1 | logistics | Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity. |
| Railway engineers · `e6-engineer` | 6 | 1 | fieldcraft | Unlock this era’s engineer unit and resource-funded tactical construction. |
| Factory standards · `e6-doctrine` | 6 | 2 | e6-siege, e6-engineer | Current-era training is 15 percent faster. |
| Low-signature doctrine · `e7-stealth` | 7 | 1 | fieldcraft | Unlock the Covert teams for the current era. |
| Rocket batteries · `e7-siege` | 7 | 1 | logistics | Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity. |
| Combat engineers · `e7-engineer` | 7 | 1 | fieldcraft | Unlock this era’s engineer unit and resource-funded tactical construction. |
| Combined arms · `e7-doctrine` | 7 | 2 | e7-siege, e7-engineer | Current-era units deal 12 percent more damage. |
| Phase-cloak theory · `e8-stealth` | 8 | 1 | fieldcraft | Unlock the Null operatives for the current era. |
| Orbital siege · `e8-siege` | 8 | 1 | logistics | Unlock this era’s siege specialist. Heavy fire support needs escorts and consumes three capacity. |
| Matter fabrication · `e8-engineer` | 8 | 1 | fieldcraft | Unlock this era’s engineer unit and resource-funded tactical construction. |
| Resonant shielding · `e8-doctrine` | 8 | 2 | e8-siege, e8-engineer | Current-era units gain two armor. |

## Validation and balance status

`validateContent(content)` checks the full runtime object shape, eight ordered eras, forty mission IDs, five missions per era, finale positions, 51 role-appropriate units, unit values and counter bounds, skill references and cycles, era restrictions, finite symmetrical budgets, map dimensions and terrain, unique authored maps and concepts, strategic structure identity and bonuses, and BFS reachability of every objective. Content tests also verify all eight referenced SVG files exist and do not fetch remote art.

These are reviewable initial numerical balance values. Automated deterministic AI-versus-AI tests provide mission viability evidence; they cannot establish human difficulty, enjoyment or every possible composition as balanced. See the final verification report for measured simulation and browser results.
