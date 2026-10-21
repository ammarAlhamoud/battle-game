# Eightfold: a short portfolio walkthrough

Use the production build (`npm run build`, then `npm run preview`) in a fresh browser profile at 1440 × 1000. Keep the local single-player save separate from any campaign you want to preserve. No account, remote API or personal data is required.

## Recording sequence — approximately 45 seconds

1. **Campaign (5 seconds):** show the first era, five mission cards and sequential unlocks.
2. **Era preview (3 seconds):** select Space, then return to Origins. Locked missions can be inspected without changing progress.
3. **Civilization (3 seconds):** open the skill tree, then close it with Escape.
4. **Battle (5 seconds):** begin the first mission and dismiss the tutorial if shown. Use Relaxed difficulty.
5. **Tactical pause and training (10 seconds):** pause, press H to select the stronghold, queue a frontline unit, then resume. Supplies decrease and the unit joins the army after training.
6. **Command (10 seconds):** pause, drag-select the army, choose Spread, then right-click an outpost on the minimap. Resume to show the units following the command.
7. **Save (4 seconds):** open the battle menu, choose Save now and close the menu.

## Engineering talking points

- Simulation and presentation are separated by typed Worker messages.
- The opponent uses local decision rules; it does not call an LLM.
- Tactical pause freezes simulation while the player prepares orders.
- Progress and battle state are saved locally; export/import supports portability.
- The repository documents AI-assisted implementation and its verification boundaries in the engineering case study.

## Scope of the tour

This demonstrates the actual opening campaign and battle flow. It does not claim a completed campaign, balanced performance on all hardware or exhaustive browser coverage. Run the documented unit and browser checks for deeper verification.
