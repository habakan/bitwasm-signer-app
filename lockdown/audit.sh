#!/usr/bin/env bash
# Read-only audit over adb; changes nothing on the phone. Usage: ./audit.sh
set -eu
cd "$(dirname "$0")"

SIGNER=app.bithanko
LOCKDOWN=app.bithanko.lockdown
sh_() { adb shell "$@" </dev/null 2>/dev/null | tr -d '\r'; }
prop() { sh_ getprop "$1"; }
list() { grep -v -e '^#' -e '^$' "$1"; }

adb get-state >/dev/null 2>&1 || { echo "No phone connected (allow USB debugging)" >&2; exit 2; }
MODEL=$(prop ro.product.model)

fails=0
warns=0
out() {
  printf '%-4s %-30s %s\n' "$1" "$2" "$3"
  case $1 in FAIL) fails=$((fails + 1)) ;; WARN) warns=$((warns + 1)) ;; esac
}
expect() { if [ "$3" = "$4" ]; then out PASS "$2" "$3"; else out "$1" "$2" "$3 (want $4)"; fi; }
empty() { if [ -z "$3" ] || [ "$3" = null ]; then out PASS "$2" "none"; else out "$1" "$2" "$3"; fi; }

main() {
  echo "# $(prop ro.product.brand) $(prop ro.product.model) / $(prop ro.build.fingerprint)"
  echo "# $(date '+%F %T')"

  echo; echo "## OS and boot"
  expect FAIL bootloader "$(prop ro.boot.flash.locked)" 1
  expect FAIL verified_boot "$(prop ro.boot.verifiedbootstate)" green
  expect FAIL build_type "$(prop ro.build.type)" user
  expect FAIL ro.debuggable "$(prop ro.debuggable)" 0
  expect FAIL selinux "$(sh_ getenforce)" Enforcing
  expect FAIL encryption "$(prop ro.crypto.state)" encrypted
  empty FAIL su "$(sh_ which su)"
  empty FAIL root_manager "$(sh_ pm list packages | grep -i -E 'magisk|supersu|kingroot' | sed 's/package://' | tr '\n' ' ')"
  local patch limit
  patch=$(prop ro.build.version.security_patch)
  limit=$(date -v-1y +%F 2>/dev/null || date -d '-1 year' +%F)
  if [[ "$patch" < "$limit" ]]; then out WARN security_patch "$patch (over a year old)"; else out PASS security_patch "$patch"; fi
  if sh_ pm list features | grep -q strongbox_keystore; then out INFO strongbox yes; else out INFO strongbox "no (TEE only)"; fi

  echo; echo "## Radios and external I/O"
  expect FAIL airplane_mode "$(sh_ settings get global airplane_mode_on)" 1
  expect FAIL wifi "$(sh_ settings get global wifi_on)" 0
  expect FAIL bluetooth "$(sh_ settings get global bluetooth_on)" 0
  expect WARN mobile_data "$(sh_ settings get global mobile_data)" 0
  local sim
  sim=$(prop gsm.sim.state)
  if echo "$sim" | grep -q -E 'READY|LOADED'; then out FAIL sim "$sim"; else out PASS sim "$sim"; fi
  expect WARN wifi_scan_always "$(sh_ settings get global wifi_scan_always_enabled)" 0
  expect WARN ble_scan_always "$(sh_ settings get global ble_scan_always_enabled)" 0
  expect WARN location "$(sh_ settings get secure location_mode)" 0

  echo; echo "## Apps"
  local enabled v
  enabled=$(sh_ pm list packages -e | sed 's/^package://')
  if echo "$enabled" | grep -qx "$SIGNER"; then
    out PASS signer "$(sh_ dumpsys package $SIGNER | sed -n 's/^ *versionName=//p' | head -1)"
  else
    out FAIL signer "not installed or disabled"
  fi
  empty FAIL third_party "$(sh_ pm list packages -3 | sed 's/package://' | grep -vx -e "$SIGNER" -e "$LOCKDOWN" | tr '\n' ' ')"
  v=$(list profiles/hide.txt | grep -Fx -f - <(echo "$enabled") || true)
  if [ -z "$v" ]; then out PASS disable_list "all disabled"; else
    out WARN disable_list "$(echo "$v" | wc -l | tr -d ' ') enabled (profiles/hide.txt)"
    echo "$v" | sed 's/^/       /'
  fi

  echo; echo "## Apps with powerful permissions"
  empty FAIL accessibility "$(sh_ settings get secure enabled_accessibility_services)"
  empty FAIL notification_listener "$(sh_ settings get secure enabled_notification_listeners)"
  empty FAIL device_admin "$(sh_ dumpsys device_policy | grep -o 'ComponentInfo{[^}]*}' | grep -v "$LOCKDOWN" | sort -u | tr '\n' ' ')"
  local op
  for op in SYSTEM_ALERT_WINDOW GET_USAGE_STATS REQUEST_INSTALL_PACKAGES; do
    empty WARN "$op" "$(sh_ appops query-op $op allow | grep -Fx -f - <(echo "$enabled") | tr '\n' ' ' || true)"
  done
  v=$(sh_ dumpsys package | awk '/^  Package \[/{p=substr($2, 2, length($2) - 2)} /android.permission.(CAMERA|RECORD_AUDIO): granted=true/{print p}' |
    sort -u | grep -Fx -f - <(echo "$enabled") | grep -vFx -f <(list profiles/camera-allow.txt) | tr '\n' ' ' || true)
  empty WARN camera_or_mic "$v"
  local ime
  ime=$(sh_ settings get secure default_input_method)
  out INFO default_ime "$ime"
  v=$(sh_ settings get secure enabled_input_methods | tr ':' '\n' | grep -vFx "$ime" | tr '\n' ' ' || true)
  empty WARN other_ime "$v"
  empty WARN assistant "$(sh_ settings get secure assistant)"

  echo; echo "## Accounts and backup"
  v=$(sh_ dumpsys account | sed -n 's/^ *Accounts: //p' | head -1)
  if [ "${v:-0}" = 0 ]; then out PASS accounts 0; else
    out FAIL accounts "$v ($(sh_ dumpsys account | grep 'Account {' | grep -o 'type=[^}]*' | sort -u | tr '\n' ' '))"
  fi
  if sh_ bmgr enabled | grep -q disabled; then out PASS backup off; else out FAIL backup on; fi

  echo; echo "## Lock screen"
  if sh_ dumpsys window policy | grep -q 'secure=true'; then out PASS screen_lock set; else out FAIL screen_lock none; fi
  expect WARN lock_screen_notifications "$(sh_ settings get secure lock_screen_show_notifications)" 0
  v=$(sh_ settings get system screen_off_timeout)
  if [ "$v" -le 60000 ]; then out PASS screen_off_timeout "${v}ms"; else out WARN screen_off_timeout "${v}ms (want 60000 or less)"; fi

  echo; echo "## Developer options (turn off when done)"
  expect WARN adb_enabled "$(sh_ settings get global adb_enabled)" 0
  expect WARN developer_options "$(sh_ settings get global development_settings_enabled)" 0

  echo; echo "FAIL $fails / WARN $warns"
  [ "$fails" = 0 ]
}

mkdir -p reports
report=reports/$MODEL-$(date +%Y%m%d-%H%M%S).txt
main | tee "$report"
status=${PIPESTATUS[0]}
echo "Saved: $report"
exit "$status"
