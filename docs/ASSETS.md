# Artwork and typography

The isometric terrain, role-specific equipment, soldiers, combat animation atlases, structures, campaign-era SVG illustrations and interface SVG icons are original artwork authored for this project.

The detailed battlefield artwork is reviewable in these source painters:

| Source | Artwork |
|---|---|
| `src/render/unit-art.ts` | 56 era/role designs covering all 51 playable roster entries; two team appearances and four articulated poses produce 448 possible frames. |
| `src/render/architecture-art.ts` | 40 main strongholds, distinct outposts, watchtowers, gates and barriers across eight eras. |
| `src/render/terrain-art.ts` | Eight environment palettes, ground materials, coastlines, water, bridges, hills and 64 scenery variants. |
| `src/render/effects-art.ts` | Era-appropriate projectiles, muzzle flashes, smoke, dust, impact sparks, deployment and tactical effects. |
| `src/ui/skill-art.ts` | Sixteen original engraved research medallions, with unique SVG gradient IDs and no baked-in text. |
| `src/ui/icons.ts` | Consistent original equipment, command and interface SVG icons. |

The active era's 56 unit frames, five architecture frames and eight scenery frames are rasterized once into local GPU atlases. Other eras' battle atlases are not allocated during that encounter. DOM portraits use the same painters as the actual units and buildings. The original fallback era SVGs remain in `scripts/create-art.py`.

`public/art/campaign-cover.webp` is original AI-assisted campaign key art generated for Eightfold with the available image-generation tool. It is decorative campaign artwork; the mission maps, live armies and all interface controls are rendered separately from actual content and simulation state. The generated PNG was encoded to WebP for distribution; the game does not download it from an external service.

`public/art/era-cover-1.webp` through `era-cover-8.webp` are additional original AI-assisted key art, each depicting its own era's soldiers, equipment and architecture. The untouched generated master is retained at `assets/source/era-key-art-atlas.png`; `bash scripts/export-era-covers.sh` splits it into eight local WebP banners using ImageMagick. These banners are used in campaign/mission intelligence and the corresponding result background. The runtime requires neither ImageMagick nor an image-generation service. Offline download includes all eight banners as well as the eight fallback era SVGs.

The interface includes local font files for offline operation:

| Font | Source | License included |
|---|---|---|
| Manrope variable | `google/fonts`, `ofl/manrope` | `public/fonts/Manrope-OFL.txt` |
| IBM Plex Sans Arabic Regular and SemiBold | `google/fonts`, `ofl/ibmplexsansarabic` | `public/fonts/PlexArabic-OFL.txt` |

The source files were downloaded over verified HTTPS from the Google Fonts GitHub repository. Both font families use the SIL Open Font License. No runtime font CDN, paid font, account or external rendering service is required.

The installed UI UX Pro Max skill is a development tool, excluded from the browser bundle. Its upstream revision and MIT license are preserved inside `.agents/skills/ui-ux-pro-max`.
