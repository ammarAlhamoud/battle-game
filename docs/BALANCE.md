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

All 40 baseline battles ended naturally before the cap. The shortest lasted 52.7 simulated seconds; the longest lasted 182 seconds. Side zero won 20 and side one won 20. No battle timed out. Deployed army peaks ranged from 10 to 19 soldiers. Both subsidiary captures and main-stronghold captures occurred, alongside legitimate military-collapse victories. This demonstrates autonomous completion and reachable objectives, rather than proving that every human strategy can win.

| Era | Mission 1 | Mission 2 | Mission 3 | Mission 4 | Finale |
|---|---|---|---|---|---|
| Prehistoric | Side 1, 65.3s | Side 0, 59.9s | Side 1, 119.0s | Side 0, 117.2s | Side 0, 83.5s |
| Bronze | Side 0, 71.5s | Side 1, 79.1s | Side 0, 124.1s | Side 1, 80.1s | Side 0, 123.0s |
| Classical | Side 1, 80.0s | Side 0, 90.5s | Side 1, 115.5s | Side 1, 99.7s | Side 1, 94.6s |
| Medieval | Side 0, 111.2s | Side 0, 127.4s | Side 0, 112.8s | Side 0, 90.7s | Side 0, 85.5s |
| Gunpowder | Side 1, 70.6s | Side 1, 75.4s | Side 0, 78.0s | Side 0, 84.2s | Side 0, 91.1s |
| Industrial | Side 1, 121.9s | Side 1, 58.6s | Side 1, 117.6s | Side 1, 87.5s | Side 1, 70.7s |
| Modern | Side 0, 72.8s | Side 1, 52.7s | Side 1, 182.0s | Side 1, 57.0s | Side 1, 77.6s |
| Space | Side 0, 79.6s | Side 0, 68.3s | Side 0, 67.4s | Side 0, 82.1s | Side 1, 65.7s |

The first and finale of each era were also tested with all persistent and current-era specialist skills. All 16 ended naturally in 42.3–113.1 seconds; side zero won 12 and side one won four. Peak deployed count reached 28. These are symmetric subsystem stress builds, independent of the campaign's actual skill-point earning sequence.

The first mission additionally ran with the legal initial three-point purchase of Common discipline and Army logistics. Both sides received the same skills and normal starting resources. That build changed the autonomous outcome from a side-one victory at 65.3 seconds to a side-zero victory at 71.1 seconds. The automated regression verifies that all earned resources equal actual kill rewards plus first-capture rewards, and that remaining resources equal starting funds plus earnings minus spending for each side.

## Timing and limits

These runs execute in Node.js in the cloud container, with parallel validation and browser work occurring on the host. They measure simulation CPU scheduling, not browser frame rate. The first isolated full-campaign pass took approximately 90 seconds of wall time; average per-mission step costs ranged from about 1.8 to 5.0 milliseconds. Concurrent repeat runs took longer, with transient host scheduling spikes. Ordinary 10 Hz updates therefore had substantial average headroom on this host, but these measurements do not establish performance on a particular consumer desktop.

Soldiers can briefly queue at narrow passages; the measured battles still completed. No claim of universal deadlock freedom or exhaustive strategic balance is made. Human playtesting over a wider range of army compositions remains useful for post-release tuning. Numerical scoring and economic formulas are documented in [SIMULATION.md](SIMULATION.md); authored mission identities and roster differences are documented in [CONTENT.md](CONTENT.md).
