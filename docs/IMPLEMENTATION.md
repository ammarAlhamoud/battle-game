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

## Shared conventions

- Coordinates use map cells; sides 0 (teal) and 1 (coral).
- Era indices 0–7, mission indices 0–4, IDs `e1m1` through `e8m5`.
- Original vector artwork is authored in code. No remote asset/CDN dependency.
- Terrain symbols: `. open`, `f forest`, `^ hill`, `~ water`, `= bridge`, `# cliff`, `g gate`, `c cover`.
- Resource income exclusively kills and first captures; no periodic income.
- UI edits issue commands; no direct authoritative-state mutation.
- AI receives a sanitized observation, never hidden live enemy positions.
- Keep all paths relative for static hosting.
- Commands remain editable during pause; simulation ticks do not advance.

## Integration checklist

- [ ] 8 eras / 40 distinct maps, reachable main strongholds, complete references
- [ ] Strict TypeScript and production build
- [ ] Combat, capture, resource, queue/refund, capacity/reserve tests
- [ ] Formation/navigation, pause, fair AI, complete save/restore tests
- [ ] Reward ledger prevents replay and defeat farming
- [ ] Real browser recruitment, orders, pause, captures and result loop
- [ ] Offline fresh reload and all-era download
- [ ] Performance measurement; honest remaining limitations

Initial repository status: empty unborn `work` branch; no user source to preserve.
