# Eightfold: engineering case study

## Problem

A browser strategy game needs consistent combat rules, resource accounting and saved progress while rendering an interactive world. Frame-rate changes, repeated rewards and incomplete saves can otherwise change session outcomes.

## Design choices and evidence

| Decision | Reason | Code to inspect |
| --- | --- | --- |
| Fixed-step simulation in a Worker | Separate simulation time from drawing | [worker.ts](../src/worker.ts), [engine.ts](../src/sim/engine.ts) |
| Typed commands and serializable state | Make UI-to-simulation boundaries explicit | [contracts.ts](../src/contracts.ts) |
| Observation-limited opponent | Prevent hidden enemy state from informing decisions | [ai.ts](../src/sim/ai.ts), [tests](../tests) |
| Validated save and reward state | Preserve progress without duplicating rewards | [persistence](../src/persistence), [progression tests](../tests/progression.test.ts) |
| Stable IDs across languages | Change presentation without changing game state | [i18n](../src/i18n) |

## Reviewer walkthrough

1. Run `npm ci`, `npm test` and `npm run build` from the repository root.
2. Start `npm run dev`, open the campaign and inspect the first mission and tactical pause.
3. Follow a typed Worker command into the simulation.
4. Read the opponent and save/progression tests, then inspect their implementation.
5. Use the [verification guide](VERIFICATION.md) for browser and offline checks.

## Verification for this portfolio review

On 2026-10-21, Node.js 24.19.0 ran **103 tests successfully**, and the production build completed. These checks cover the simulation/content/persistence-domain suites and compilation. Browser, offline and visual scenarios were not rerun in this review; earlier results and reproduction instructions remain in the verification guide.

## Trade-offs and boundaries

- Fixed ticks make behavior reproducible but require rendering interpolation and careful Worker messages.
- Local persistence supports offline play, without cross-device synchronization or authenticated save files.
- The opponent is rule/utility-based game AI, not an LLM agent or learned policy.
- Passing simulation tests does not establish usability or performance on every device.

## Development process

The [implementation registry](IMPLEMENTATION.md) documents AI-assisted implementation. Code and tests are reviewable evidence; human responsibilities and AI contributions should be described accurately rather than inferred from repository ownership.
