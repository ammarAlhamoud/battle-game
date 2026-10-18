# Artwork and typography

The isometric terrain, role-specific equipment, soldiers, combat animation atlases, structures, campaign-era SVG illustrations and interface SVG icons are original artwork authored for this project. Their source is in `src/render`, `src/ui/icons.ts` and `scripts/create-art.py`.

`public/art/campaign-cover.webp` is original AI-assisted campaign key art generated for Eightfold with the available image-generation tool. It is decorative campaign artwork; the mission maps, live armies and all interface controls are rendered separately from actual content and simulation state. The generated PNG was encoded to WebP for distribution; the game does not download it from an external service.

The interface includes local font files for offline operation:

| Font | Source | License included |
|---|---|---|
| Manrope variable | `google/fonts`, `ofl/manrope` | `public/fonts/Manrope-OFL.txt` |
| IBM Plex Sans Arabic Regular and SemiBold | `google/fonts`, `ofl/ibmplexsansarabic` | `public/fonts/PlexArabic-OFL.txt` |

The source files were downloaded over verified HTTPS from the Google Fonts GitHub repository. Both font families use the SIL Open Font License. No runtime font CDN, paid font, account or external rendering service is required.

The installed UI UX Pro Max skill is a development tool, excluded from the browser bundle. Its upstream revision and MIT license are preserved inside `.agents/skills/ui-ux-pro-max`.
