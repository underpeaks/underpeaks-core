#!/bin/sh
set -e
DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"
# Keep installer output on the volume. Dangling links are fine on first run:
# the app sees "not installed", and writes create the target in /data.
for f in .env.local underpeaks.config.json; do
  ln -sfn "$DATA_DIR/$f" "/app/$f"
done
exec "$@"