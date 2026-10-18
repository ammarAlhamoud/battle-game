# Professionalization review — 18 October 2026

Scope: existing campaign, civilization tree, first battle, tactical commands, recruitment,
Arabic settings, compact battle layout, deterministic combat, and worker/save lifecycle.
Goal: make battlefield decisions readable, orders predictable, and progress recoverable.
This is a combined UX and accessibility review, followed by implementation work.

## Current-run visual evidence

Captured from the running application in a fresh Chromium context at 1440×1000,
1100×768 and 768×900. DOM snapshots were recorded before interactions; screenshots
were saved and inspected. No browser page errors occurred. The full capture transcript
is in the local ignored `test-results/pro-audit/evidence.json`.

1. **Campaign — healthy foundation.** Era navigation, mission locks and progression are
   clear. The illustrations and local fonts have a coherent identity.
   [Campaign screenshot](screenshots/pro-audit/before-campaign.png).
2. **Research — usable, needs decision support.** Branches and prerequisites are visible,
   but understanding the army still requires reading separate descriptions. Combat
   counters and terrain effects should be available where units are selected/recruited.
3. **First battle — high priority.** The clock starts while the tutorial covers the player's
   army. Learning the controls consumes actual combat time. Start the first tutorial
   paused and make the transition into live play explicit.
   [First battle screenshot](screenshots/pro-audit/before-tutorial.png).
4. **Field command — high priority.** The selected army and formation controls are clear,
   but there is no persistent objective/capture/threat summary. Global abilities and
   construction use numeric coordinate forms rather than pointing at the field. Add
   direct targeting, a visible area preview, cancellation, and a keyboard form fallback.
   [Command screenshot](screenshots/pro-audit/before-command.png).
5. **Recruitment and Arabic settings — functional.** Actual unit portraits, costs, queues,
   reserve accounting, live language switching and RTL are present. At compact sizes
   the roster scrolls within its panel. Tactical additions must preserve that layout.
   [Arabic compact screenshot](screenshots/pro-audit/before-ar-compact.png).

## Specialist engineering and RTS findings

| Priority | Evidence | Player consequence | Action |
|---|---|---|---|
| Critical | `updateUnit` attacks before processing explicit Move; a deterministic frontline retreat stayed at its starting cell for three seconds while taking damage | Players cannot reliably disengage; movement orders feel ignored | Give explicit Move precedence; expose targetless Attack as attack-move |
| High | Ended battle retains purchased skills after a successful campaign respec; strict save validator then rejects it | Progress after respec cannot be saved/exported correctly | Retire ended snapshots after respec, preserving campaign records and rewards |
| High | Worker errors only produce a toast; periodic snapshots also satisfy explicit snapshot requests | A stopped simulation can leave an inert battlefield; save causality is unclear | Isolate worker sessions, correlate snapshot replies, recover visibly on failure |
| High | First-battle screenshot and initial worker state have time running during tutorial | New players lose learning time | Pause tutorial before the first simulation tick |
| Medium | Hundreds of hidden tile polygons remain Phaser Graphics geometry every render | Avoidable repeated work, hard-edged fog grid | Raster-cache fog and soften its edge while keeping visibility authoritative |
| Medium | Camera keyboard code checks text fields but not modal state | Arrow keys can move the map behind settings/research | Disable battlefield input while a dialog is open |
| Medium | Paused ability casts at different coordinates coexist; first queued target executes and later casts fail cooldown | A revised plan silently uses the old target | Keep the latest pending target per ability |

## Accessibility and verification limits

Existing strengths include labelled controls, focus trapping/restoration, keyboard groups,
live RTL, and a tactical pause. New target previews must also expose text feedback and a
coordinate alternative, and threat updates must avoid announcing every simulation tick.
Canvas units are not a semantic screen-reader representation of the full battlefield.
This review does not certify WCAG compliance. No human playtest or physical GPU target
has been measured; Chromium here uses software WebGL. AI-vs-AI results do not establish
human difficulty or professional competitive balance.

## Work ownership and integration

The implementation follows the original specification §1.1: root owns contracts,
targeting/UI integration, documentation, validation and granular Git pushes; specialist
agents own simulation regressions, worker lifecycle recovery, renderer/fog, and the
objective/alert component. Shared contracts are agreed before dependent edits. Changes
must preserve v1 portable saves, fog privacy, fixed-step determinism and both languages.

Implementation status and final verification are recorded below as each change lands.
