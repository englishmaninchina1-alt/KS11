#!/usr/bin/env bash
#
# Boots the Wordy World APK in a headless Android emulator and checks the things
# only a real WebView can prove: that a word card opens on screen, that the app
# speaks through Android text-to-speech, and that the microphone recorder starts.
#
#   bash android-app/scripts/emulator-test.sh [path/to/app.apk]
#
# If a device is already attached (as in CI, where android-emulator-runner boots
# one) this reuses it and leaves it running. Otherwise it boots its own, which
# needs hardware acceleration (/dev/kvm).
#
# Screenshots and UI dumps land in android-app/scripts/out/. Set STRICT=1 to make
# the speech and recording checks fail the run instead of warning.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# The Android toolchain is several GB, so keep it outside the project that gets
# published. ANDROID_HOME wins; otherwise try the usual local locations.
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ]; then
  for candidate in "$HOME/android-toolchain/tools/android-sdk" "$ROOT/tools/android-sdk"; do
    if [ -d "$candidate" ]; then SDK="$candidate"; break; fi
  done
fi
SDK="${SDK:-$HOME/android-toolchain/tools/android-sdk}"
ADB="$SDK/platform-tools/adb"
EMULATOR="$SDK/emulator/emulator"
AVDMANAGER="$(ls "$SDK"/cmdline-tools/*/bin/avdmanager 2>/dev/null | head -1)"
SDKMANAGER="$(ls "$SDK"/cmdline-tools/*/bin/sdkmanager 2>/dev/null | head -1)"
AVD_NAME="${AVD_NAME:-wordy}"
IMAGE="system-images;android-30;google_apis;x86_64"
APK="${1:-$ROOT/public/wordy-world-android.apk}"
OUT="$ROOT/android-app/scripts/out"
PKG="page.freebuff.ks11"
STRICT="${STRICT:-0}"

fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
warn() { printf 'warning: %s\n' "$*" >&2; }
strict() { [ "$STRICT" = "1" ]; }
say() { printf '\n== %s\n' "$*"; }

[ -x "$ADB" ] || fail "adb not found at $ADB — set ANDROID_HOME"
[ -f "$APK" ] || fail "APK not found: $APK"
command -v python3 >/dev/null || fail "python3 is required to read the UI tree"
mkdir -p "$OUT"
"$ADB" start-server >/dev/null 2>&1

# Reuse an emulator that CI (or a developer) already started.
ATTACHED="$("$ADB" devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"
REUSING=""
if [ -n "$ATTACHED" ] && \
   [ "$("$ADB" -s "$ATTACHED" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
  export ANDROID_SERIAL="$ATTACHED"
  REUSING=1
  say "reusing the attached device $ATTACHED"
fi

if [ -z "$REUSING" ]; then
  if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
    fail "no access to /dev/kvm, and the x86_64 emulator needs hardware acceleration.
       Fix: sudo gpasswd -a \$USER kvm, then log out and back in (or use a machine
       with KVM, such as a GitHub-hosted runner or a Linux laptop)."
  fi

  say "preparing the virtual device"
  if [ ! -f "$HOME/.android/avd/$AVD_NAME.ini" ]; then
    [ -x "$SDKMANAGER" ] || fail "sdkmanager not found; cannot install $IMAGE"
    yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
    "$SDKMANAGER" --install emulator "$IMAGE" >/dev/null
    echo no | "$AVDMANAGER" create avd -n "$AVD_NAME" -k "$IMAGE" --force >/dev/null
  fi

  say "booting $AVD_NAME"
  "$EMULATOR" -avd "$AVD_NAME" -no-window -no-snapshot -no-boot-anim \
    -gpu swiftshader_indirect -netdelay none -netspeed full > "$OUT/emulator.log" 2>&1 &
  EMULATOR_PID=$!
  trap 'kill "$EMULATOR_PID" 2>/dev/null || true' EXIT

  for _ in $(seq 1 120); do
    [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
    kill -0 "$EMULATOR_PID" 2>/dev/null || fail "the emulator exited; see $OUT/emulator.log"
    sleep 2
  done
  [ "$("$ADB" shell getprop sys.boot_completed | tr -d '\r')" = "1" ] || fail "boot timed out"
fi

say "installing $(basename "$APK")"
"$ADB" install -r -g "$APK" | tail -1
"$ADB" shell settings put global window_animation_scale 0
"$ADB" shell settings put global transition_animation_scale 0
"$ADB" shell settings put global animator_duration_scale 0
"$ADB" logcat -c

say "launching Wordy World"
"$ADB" shell am start -n "$PKG/.MainActivity" >/dev/null
sleep 8

# Taps the first on-screen node whose text or description contains $1.
tap_text() {
  "$ADB" shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  "$ADB" pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1 || true
  local point
  point=$(python3 - "$OUT/ui.xml" "$1" <<'PY'
import re, sys, xml.etree.ElementTree as ET
path, needle = sys.argv[1], sys.argv[2].lower()
for node in ET.parse(path).getroot().iter('node'):
    for attr in ('text', 'content-desc'):
        if needle in (node.get(attr) or '').lower():
            m = re.match(r'\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]', node.get('bounds', ''))
            if m:
                x1, y1, x2, y2 = map(int, m.groups())
                print((x1 + x2) // 2, (y1 + y2) // 2)
                sys.exit(0)
sys.exit(1)
PY
  ) || return 1
  "$ADB" shell input tap $point
}

# Returns the bounds of the first matching node, e.g. "60 400 480 1000".
find_bounds() {
  "$ADB" shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
  "$ADB" pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1 || true
  python3 - "$OUT/ui.xml" "$1" <<'PY'
import re, sys, xml.etree.ElementTree as ET
path, needle = sys.argv[1], sys.argv[2].lower()
for node in ET.parse(path).getroot().iter('node'):
    for attr in ('text', 'content-desc'):
        if needle in (node.get(attr) or '').lower():
            m = re.match(r'\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]', node.get('bounds', ''))
            if m:
                print(*m.groups())
                sys.exit(0)
sys.exit(1)
PY
}

say "opening a word"
tap_text "Worlds" || fail "could not find the Worlds link"
sleep 3
tap_text "Animals" || fail "could not find the Animals world"
sleep 4
tap_text "cat" || fail "could not find a word card to tap"
sleep 3
"$ADB" exec-out screencap -p > "$OUT/word-card.png"

say "checking the word card is on screen"
BOUNDS=$(find_bounds "Your turn to say it") || fail "the word card did not open (no 'Your turn to say it' on screen)"
read -r _X1 Y1 _X2 Y2 <<< "$BOUNDS"
HEIGHT=$("$ADB" shell wm size | tr -d '\r' | awk -F': ' '{print $2}' | awk -Fx '{print $2}')
if [ "$Y1" -lt 0 ] || [ "$Y2" -gt "$HEIGHT" ]; then
  fail "the word card opened partly off screen (y $Y1..$Y2 of $HEIGHT)"
fi
echo "word card on screen at y $Y1..$Y2 of $HEIGHT"

say "checking speech"
tap_text "Listen" || fail "could not find the Listen button"
sleep 4
if "$ADB" logcat -d | grep -qiE 'Synthesis|TtsService'; then
  echo "text-to-speech engine was asked to speak"
else
  warn "no TTS log lines seen — the device may have no English voice installed"
  strict && fail "text-to-speech did not run"
fi

say "checking the microphone"
tap_text "Record" || fail "could not find the Record button"
sleep 5
if find_bounds "Stop (" >/dev/null; then
  echo "recording started"
else
  warn "recording did not start (permission or microphone unavailable)"
  strict && fail "the microphone recorder did not start"
fi
"$ADB" exec-out screencap -p > "$OUT/recording.png"

say "done"
echo "screenshots: $OUT/word-card.png, $OUT/recording.png"
