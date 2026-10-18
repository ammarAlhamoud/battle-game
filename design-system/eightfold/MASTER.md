# Eightfold — Command Atlas design system

Applied with the project-local [UI UX Pro Max skill](../../.agents/skills/ui-ux-pro-max/SKILL.md), from the source revision recorded in its SOURCE.json.

## Research and decisions

The gaming design-system query returned immersive dark surfaces and a strong action hierarchy; its marketing landing-page pattern is not applicable to an RTS. A focused style query returned `minimalism-and-swiss-style`, with grid-based information hierarchy, high contrast, coherent typography and restrained motion. The implementation combines that interface discipline with original isometric game artwork. The specification still requires a 2D renderer.

The RTL queries returned no indexed match. Arabic support therefore uses native HTML language/direction, CSS logical properties, explicit translation contracts and browser tests; it is not attributed to a matching skill database entry. The keyboard-focus query confirmed visible focus and unobscured modal controls.

## Visual direction

- A dark command center with slate/forest surfaces, warm ivory text, muted gold actions, teal allied-state and coral enemy-state indicators. One coherent default theme.
- Semantic tokens: background #0e171c, surface #152229, raised #1b2c33, border #30424b, text #f0eee7, secondary #aebec1, accent #d9b574, allied #79c9ad, enemy #e69583.
- Body copy 14–16px desktop; compact metadata never below 11px. Headings 24/32/48px. Line height 1.5–1.7; Arabic uses its own locally packaged font and natural word spacing.
- 4/8px spacing rhythm, 12px panel corners, strong consistent outlines, focused primary actions. No emoji navigation or decorative fake controls.
- Persistent campaign navigation, clearly distinguished era selection, map-preview mission cards, an immediately identifiable next mission and resume action.
- Battle resources remain visible. Controls use generous hit areas and distinct selected/disabled states. Production, queues and abilities retain their actual simulation behavior.
- Settings exposes English/Arabic, applies immediately, saves locally and never resets battle state. Arabic mirrors the interface while map coordinates and combat remain unchanged.
- Modal focus is trapped and restored; Escape closes. Reduced-motion preference removes nonessential transitions.

## Review

Review campaign, briefing, battle, production, orders, skills, settings, tutorials and results in both languages at 1440×1000 and 1100×760. Check smaller campaign layouts, text wrapping, keyboard controls, saves and offline reload. Verify actual interactions after visual changes.
