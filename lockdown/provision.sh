#!/usr/bin/env bash
# Builds Lockdown with the signer bundled and writes the provisioning QR code to out/.
# Usage: ./provision.sh <bitwasm-signer.apk> [download URL]
#   without a URL: a debug build served to this LAN, for development
#   with a URL:    a release build that will be uploaded there (the release workflow)
set -eu
SIGNER_APK=$(realpath "${1:?"usage: ./provision.sh <bitwasm-signer.apk> [download URL]"}")
cd "$(dirname "$0")"

URL=${2:-}
PORT=8000

mkdir -p signer out
cp "$SIGNER_APK" signer/bitwasm-signer.apk
if [ -n "$URL" ]; then
  [ -f keystore.properties ] || { echo "A release build needs keystore.properties" >&2; exit 1; }
  ./gradlew -q assembleRelease
  cp build/outputs/apk/release/signer-lockdown-release.apk out/lockdown.apk
else
  IP=$(ipconfig getifaddr en0)
  URL=http://$IP:$PORT/lockdown.apk
  ./gradlew -q assembleDebug
  cp build/outputs/apk/debug/signer-lockdown-debug.apk out/lockdown.apk
fi

# The phone checks the downloaded APK against this (SHA-256, base64url without padding)
checksum=$(openssl dgst -binary -sha256 out/lockdown.apk | openssl base64 -A | tr '+/' '-_' | tr -d '=')

cat >out/provisioning.json <<EOF
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.habakan.signer_lockdown/com.habakan.signer_lockdown.AdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "$URL",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": "$checksum",
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
  "android.app.extra.PROVISIONING_SKIP_ENCRYPTION": false
}
EOF
qrencode -o out/provisioning.png -s 8 <out/provisioning.json
cat out/provisioning.json

[ -z "${2:-}" ] || exit 0
open out/provisioning.png
echo "Serving $URL (Ctrl-C once the phone has downloaded it)"
python3 -m http.server "$PORT" --bind "$IP" -d out
