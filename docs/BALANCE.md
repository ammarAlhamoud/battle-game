# Measured simulation checks

The headless runner uses the production engine, actual authored campaign maps, the normal command interface and the same observation-filtered AI for both factions. Neither side receives extra resources, statistics, sight or recruitment privileges. The fixed timestep is 0.1 seconds; each run has a 6,000-tick / 600-second cap.

Run after `npm test`:

```sh
node scripts/simulate-campaign.mjs --all
node scripts/simulate-campaign.mjs --skills
node scripts/simulate-campaign.mjs --mission=e1m1 --basic-skills
```

The runner writes detailed machine-readable reports under ignored `test-results/`. It can also export complete, production-validated saves immediately before genuine first-mission results. Exported fixtures preserve positions, health, resources, production and capture progress exactly; only the automated test controller for the player faction is removed for browser continuation.

## Campaign viability

After the explicit-movement/attack-move correction, all 40 baseline battles were rerun and ended naturally before the cap. The shortest lasted 53.1 simulated seconds; the longest lasted 247.6 seconds. Side zero won 21 and side one won 19. No battle timed out. Deployed army peaks ranged from 10 to 19 soldiers. Both subsidiary captures and main-stronghold captures occurred, alongside legitimate military-collapse victories. This demonstrates autonomous completion and reachable objectives, rather than proving that every human strategy can win.

| Era | Mission 1 | Mission 2 | Mission 3 | Mission 4 | Finale |
|---|---|---|---|---|---|
| Prehistoric | Side 1, 66.7s | Side 0, 59.9s | Side 1, 113.4s | Side 1, 247.6s | Side 0, 96.3s |
| Bronze | Side 0, 75.8s | Side 1, 81.3s | Side 0, 100.6s | Side 1, 80.5s | Side 0, 115.2s |
| Classical | Side 1, 88.3s | Side 0, 155.8s | Side 0, 141.8s | Side 1, 77.1s | Side 1, 94.6s |
| Medieval | Side 0, 94.1s | Side 0, 153.1s | Side 1, 163.1s | Side 0, 87.0s | Side 0, 83.6s |
| Gunpowder | Side 1, 73.4s | Side 0, 95.0s | Side 0, 77.0s | Side 0, 106.3s | Side 0, 89.5s |
| Industrial | Side 0, 82.7s | Side 1, 59.3s | Side 1, 117.6s | Side 1, 65.8s | Side 1, 82.2s |
| Modern | Side 1, 87.4s | Side 1, 53.1s | Side 0, 75.0s | Side 1, 58.6s | Side 1, 88.4s |
| Space | Side 0, 86.6s | Side 0, 62.8s | Side 0, 59.5s | Side 0, 71.4s | Side 1, 65.8s |

The first and finale of each era were also tested with all persistent and current-era specialist skills. All 16 were rerun after the movement correction and ended naturally in 41.2–119.2 seconds; side zero won 10 and side one won 6. Peak deployed count reached 27. These are symmetric subsystem stress builds, independent of the campaign's actual skill-point earning sequence.

The first mission additionally ran with the legal initial three-point purchase of Common discipline and Army logistics. Both sides received the same skills and normal starting resources. That build changed the autonomous outcome from a side-one victory at 66.7 seconds to a side-zero victory at 92.9 seconds. The automated regression verifies that all earned resources equal actual kill rewards plus first-capture rewards, and that remaining resources equal starting funds plus earnings minus spending for each side.

## Timing and limits

These runs execute in Node.js in the cloud container, with parallel validation and browser work occurring on the host. They measure simulation CPU scheduling, not browser frame rate. The first isolated full-campaign pass took approximately 90 seconds of wall time; average per-mission step costs ranged from about 1.8 to 5.0 milliseconds. Concurrent repeat runs took longer, with transient host scheduling spikes. Ordinary 10 Hz updates therefore had substantial average headroom on this host, but these measurements do not establish performance on a particular consumer desktop.

Soldiers can briefly queue at narrow passages; the measured battles still completed. No claim of universal deadlock freedom or exhaustive strategic balance is made. Human playtesting over a wider range of army compositions remains useful for post-release tuning. Numerical scoring and economic formulas are documented in [SIMULATION.md](SIMULATION.md); authored mission identities and roster differences are documented in [CONTENT.md](CONTENT.md).

## Human balance and research decisions still to validate

These runs establish completion, finite economy and controller consistency, not human
difficulty. The initial specialist review found sampled winning scores several times
above the highest reward threshold; a broader distribution of human strategies is
needed before retuning mastery rewards. Campaign research currently grants the same
doctrine set to both factions in a new battle. This is symmetric progression, and should
be evaluated explicitly in playtests rather than described as a unilateral army bonus.
