# Measured simulation performance

Measurements below were collected on 18 October 2026 at 12:12 UTC using the real compiled simulation and complete campaign content. This is a synthetic headless Node benchmark. It excludes Phaser rendering, browser layout, Worker messaging, IndexedDB, GPU work, and display frame rate. It does not establish 60 FPS or 30 FPS on consumer hardware.

Run current tests to compile the modules, then execute the dependency-free benchmark:

```sh
npm test
node --expose-gc scripts/benchmark.mjs
```

Raw observations and timing summaries are written to the ignored `test-results/benchmark.json`. `--expose-gc` permits post-collection memory comparisons; omitting it runs the same workloads with less interpretable memory samples.

## Environment and method

- Node v24.19.0, Linux x64, kernel 6.18.55.
- Shared AMD EPYC 9V74 host; five logical CPUs visible, cgroup CPU quota equivalent to four cores. Simulation work runs on one Node thread.
- Container memory limit 32 GiB; host-visible memory approximately 33.3 GiB.
- Authoritative fixed timestep: 100 ms (10 ticks per simulated second). Thirty ticks warm the simulation before measurement.
- Both factions use the real, observation-filtered AI. Recruitment, movement, collision, combat, capture, fog, and defeat remain enabled.
- Density fixtures use the authored Medieval `e4m2` map. Initial role templates keep their authored health and combat statistics. Units have unique IDs and separate passable cell positions. Artificial deployment can exceed ordinary mission capacity; subsequent deployment obeys the normal capacity rules. This deliberately stresses the existing-army case rather than changing unit balance.
- Each ordinary/heavy timing sample measures only `stepBattle`. Fixture construction and memory collection happen outside tick timers. Casualties and legal reinforcements change the live unit count during measurement.

## Results

| Workload | Samples | Mean | Median | 95th percentile | Maximum |
|---|---:|---:|---:|---:|---:|
| Ordinary: 40 initial units; 29–41 observed | 200 ticks | 9.602 ms | 7.601 ms | 26.434 ms | 41.879 ms |
| Heavy: 200 initial units; 161–200 observed | 200 ticks | 46.416 ms | 38.992 ms | 80.509 ms | 159.134 ms |
| One-cell bridge and dynamic barrier routing | 100 routes | 0.141 ms | 0.152 ms | 0.221 ms | 0.755 ms |
| Create battle plus 10 ticks, cycling all 40 missions | 50 transitions | 24.210 ms | 21.632 ms | 34.669 ms | 40.143 ms |
| Extended ordinary encounter/replay workload | 5,000 ticks | 5.455 ms | 4.121 ms | 9.945 ms | 55.678 ms |

Ordinary and heavy encounters each simulated 20 seconds. Every bridge test used a 28 × 24 map with one crossing. Fifty routes reached their exact goal; fifty routes encountered a completed enemy barrier and returned a safe reachable approach instead of crossing the obstruction. The 100 routes consumed 14.130 ms in total.

The heavy workload's 99th percentile was 100.945 ms, with an occasional 159.134 ms tick exceeding the 100 ms real-time simulation budget on this shared host. An earlier run on the same host measured a 31.304 ms heavy mean and 37.113 ms heavy 95th percentile; shared load and JIT/GC timing materially affect the result. Average headroom on this server does not guarantee smooth rendering or worst-case scheduling on other machines.

## Extended activity and memory

The 5,000-tick workload simulated 500 seconds, resetting only after an actual battle result. Six battles completed with side 1 winning at 75.8 seconds; the deterministic fixture reproduced that result each time. The seventh battle was still active at 45.2 seconds when measurement stopped. Across the workload, units moved approximately 6,260 cell lengths, dealt 45,947 damage, and changed objective ownership 33 times. The longest interval with neither movement, damage, nor a capture was 0.1 seconds. This fixture showed ongoing activity and completed battles; it is not a proof that every tactical arrangement avoids deadlock or that every mission is balanced.

| Post-GC measurement | Before | After | Interpretation |
|---|---:|---:|---|
| 50-transition retained heap | 6.005 MB | 6.062 MB | Approximately 56 KB growth while cycling all campaign missions |
| Extended-session retained heap | 6.012 MB | 6.398 MB | Approximately 386 KB growth, including an active battle and retained measurement arrays |
| Extended-session RSS | 93.237 MB | 118.227 MB | Allocator/JIT/process pages grew; RSS is not retained application-object size |
| Extended-session ArrayBuffers | 137 KB | 137 KB | Stable at the sampled endpoints |

Memory units in this table are decimal. Extended-session post-GC heap samples ranged from approximately 6.18 to 6.50 MB; RSS rose early and then stayed around 118–120 MB. Timing arrays, sample records, JIT compilation, and the active battle remain live during measurement. These observations show bounded memory in this run, not a general absence of leaks. Browser scene disposal, WebGL textures, Worker termination, longer sessions, and repeated UI transitions require separate browser evidence.

## Practical limits

The test host is a server CPU rather than a representative mid-range desktop. There is no headless-to-FPS conversion. The benchmark does not cover all skill combinations, maximal construction density, arbitrary imported states, or every adversarial congestion pattern. Browser frame timing and visual acceptance results belong in the separate verification report. Heavy simulation still has occasional timing spikes and should be profiled again on target desktop hardware before making frame-rate guarantees.
