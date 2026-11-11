#!/usr/bin/env bash
#
# Builds the cPanel package: the Vite build plus the PHP API, ready to upload.
#
#   bash scripts/build-cpanel.sh          # -> wordy-world-cpanel.zip
#
# The static shell is regenerated from src/ every time; api/, ww-private/, the
# .htaccess files and sql/ are hand-written and copied through untouched.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build

STAGE="$ROOT/cpanel-export/public_html"
OUT="$ROOT/wordy-world-cpanel.zip"

# Replace only the generated parts, so the PHP and Apache files stay put.
rm -rf "$STAGE/assets" "$STAGE/index.html"
find "$STAGE" -maxdepth 1 -name '*.apk' -delete
find "$STAGE" -maxdepth 1 -name '*.svg' -delete
mkdir -p "$STAGE"
cp -R dist/. "$STAGE/"

rm -f "$OUT"
if command -v zip >/dev/null; then
  (cd "$ROOT/cpanel-export" && zip -qr "$OUT" . -x '*.DS_Store' '*/.DS_Store')
else
  python3 - "$ROOT" "$OUT" <<'PY'
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
base = os.path.join(root, 'cpanel-export')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for path, _dirs, files in os.walk(base):
        for name in files:
            if name == '.DS_Store':
                continue
            full = os.path.join(path, name)
            z.write(full, os.path.relpath(full, base))
PY
fi

echo "built $OUT ($(stat -c %s "$OUT") bytes)"
echo "contents:"
if command -v unzip >/dev/null; then unzip -l "$OUT" | tail -n +4 | head -20; fi
