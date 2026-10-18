#!/usr/bin/env bash
# Split the original AI-assisted eight-panel key art; no runtime image service.
set -euo pipefail
cd "$(dirname "$0")/.."
if command -v magick >/dev/null; then
  image_command=(magick)
else
  image_command=(convert)
fi
for era in {1..8}; do
  column=$(( (era - 1) % 2 ))
  row=$(( (era - 1) / 2 ))
  "${image_command[@]}" assets/source/era-key-art-atlas.png \
    -crop "768x256+$((column * 768))+$((row * 256))" +repage \
    -quality 90 "public/art/era-cover-${era}.webp"
done
