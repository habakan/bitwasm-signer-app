#!/usr/bin/env bash
# Installs the signer over adb and, if asked, makes Signer Lockdown the device owner. The phone stays offline.
# Usage: ./install.sh <bithanko.apk> [lockdown.apk]
set -eu

SIGNER_APK=${1:?"usage: ./install.sh <bithanko.apk> [lockdown.apk]"}
LOCKDOWN_APK=${2:-$(dirname "$0")/build/outputs/apk/debug/signer-lockdown-debug.apk}
LOCKDOWN_ADMIN=app.bithanko.lockdown/.AdminReceiver

sh_() { adb shell "$@" </dev/null | tr -d '\r'; }
ask() { read -r -p "$1 [y/N] " answer && [ "$answer" = y ]; }
sha256() { shasum -a 256 "$1" | cut -d' ' -f1; }

echo "== 1. Phone"
devices=$(adb devices | grep -c -w device || true)
[ "$devices" = 1 ] || { echo "Connect exactly one Android phone over USB and allow USB debugging ($devices now)"; exit 1; }
echo "$(sh_ getprop ro.product.brand) $(sh_ getprop ro.product.model) / Android $(sh_ getprop ro.build.version.release)"

echo; echo "== 2. Signer"
echo "SHA-256: $(sha256 "$SIGNER_APK")"
echo "Check it matches SHA256SUMS on the release page"
ask "It matches. Install?" || exit 1
adb install -r "$SIGNER_APK"

echo; echo "== 3. Device owner"
echo "As the device owner, Signer Lockdown can block radios, new apps, USB debugging and more on the phone."
echo "Removing it takes Lockdown's own screen or a factory reset."
ask "Make it the device owner?" || { echo "Installed the signer only"; exit 0; }

accounts=$(sh_ dumpsys account | sed -n 's/^ *Accounts: //p' | head -1)
[ "${accounts:-0}" = 0 ] || { echo "The phone has $accounts account(s). Remove them all in Settings > Accounts and run this again"; exit 1; }

echo "Lockdown SHA-256: $(sha256 "$LOCKDOWN_APK")"
adb install -r "$LOCKDOWN_APK"
result=$(sh_ dpm set-device-owner "$LOCKDOWN_ADMIN" 2>&1)
echo "$result"
echo "$result" | grep -q '^Success' || exit 1

echo; echo "== 4. On the phone"
echo "1) Turn on airplane mode"
echo "2) Open Signer Lockdown and tap Apply restrictions (this stops USB debugging and disconnects this PC)"
