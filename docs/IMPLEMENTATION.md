# Eightfold — implementation registry

The user-authorized specification is `FINAL_RTS_GAME_IMPLEMENTATION_PROMPT.txt`.
This is an application implementation task; source creation is explicitly authorized.

## Dependency map

`contracts.ts` → content + navigation/AI + simulation → Worker → renderer + HUD → save/PWA → integration tests.
All authoritative state is JSON-serializable. Simulation advances at 10 Hz; WebGL presentation runs independently.

## Ownership

| Component | Owner | Integration contract |
|---|---|---|
| Contracts, Worker, integration, PWA | Lead | `src/contracts.ts` |
| Eight eras, 40 handcrafted missions, skills, validation | Content agent | `src/content/index.ts`: `content`, `validateContent` |
| Deterministic simulation, combat, production, economy, capture | Simulation agent | `src/sim/engine.ts`: `createBattle`, `stepBattle`, `applyCommand` |
| Navigation, formations, observed-information AI | AI agent | `src/sim/navigation.ts`, `src/sim/ai.ts` |
| Phaser isometric renderer, original art, animations | Visual agent | `src/render/index.ts`: `createRenderer(options)` |
| Campaign, HUD, production, skills, results | UI agent | `src/ui/index.ts`: `mountUI(options)` |
| IndexedDB, progression, save validation and tests | Persistence/QA agent | `src/persistence/index.ts`, `tests/` |
| UI UX Pro redesign, bilingual content, live RTL settings, browser integration | Lead | `src/ui/`, `src/i18n/`, `design-system/eightfold/MASTER.md` |

## Shared conventions

- Coordinates use map cells; sides 0 (teal) and 1 (coral).
- Era indices 0–7, mission indices 0–4, IDs `e1m1` through `e8m5`.
- Original gameplay vector artwork is authored in code; campaign cover and local font provenance are recorded in `ASSETS.md`. No runtime asset/CDN dependency.
- Terrain symbols: `. open`, `f forest`, `^ hill`, `~ water`, `= bridge`, `# cliff`, `g gate`, `c cover`.
- Resource income exclusively kills and first captures; no periodic income.
- UI edits issue commands; no direct authoritative-state mutation.
- AI receives a sanitized observation, never hidden live enemy positions.
- Keep all paths relative for static hosting.
- Commands remain editable during pause; simulation ticks do not advance.

## Integration checklist

- [x] 8 eras / 40 distinct maps, reachable main strongholds, complete references
- [x] Strict TypeScript and production build
- [x] Combat, capture, resource, queue/refund, capacity/reserve tests
- [x] Formation/navigation, pause, fair AI, complete save/restore tests
- [x] Reward ledger prevents replay and defeat farming
- [x] Real browser recruitment, orders, pause, captures and result loop
- [x] Offline fresh reload and all-era download
- [x] Performance measurement; honest remaining limitations
- [x] Live English/Arabic settings, backward-compatible language saves, full authored Arabic content and RTL browser checks

Initial repository status: empty unborn `work` branch; no user source to preserve.
