#!/bin/sh
# pi-tab-summary environment check
#
# The extension works without Ghostty (title via OSC 0) and without tmux.
# This script reports optional components and prints the config snippets to
# add. It only warns on real misconfiguration: tmux active without title
# forwarding, or macOS Ghostty too old for custom bell audio.
#
# Exit 0 when no warnings, 1 when warnings were found.

set -u

warnings=0
os=$(uname -s 2>/dev/null || printf 'unknown')

info() {
  echo "INFO: $1"
}

ok() {
  echo "OK: $1"
}

warn() {
  echo "WARN: $1"
  warnings=$((warnings + 1))
}

# --- Ghostty (optional) ---
if command -v ghostty >/dev/null 2>&1; then
  version_line=$(ghostty --version 2>/dev/null | head -n 1)
  version=$(printf '%s' "$version_line" | sed -n 's/.*Ghostty \([0-9][0-9]*\.[0-9][0-9]*\).*/\1/p')
  if [ -z "$version" ]; then
    info "ghostty found, but its version could not be parsed: $version_line"
  else
    major=$(printf '%s' "$version" | cut -d. -f1)
    minor=$(printf '%s' "$version" | cut -d. -f2)
    ok "Ghostty $version found"
    if [ "$os" = "Darwin" ] && { [ "$major" -lt 1 ] || { [ "$major" -eq 1 ] && [ "$minor" -lt 3 ]; }; }; then
      warn "macOS Ghostty < 1.3.0: custom bell audio (bell-audio-path) needs >= 1.3.0"
    fi
  fi
else
  info "ghostty not found (optional; the tab title works through OSC 0 in any terminal)"
fi

# --- tmux (optional) ---
if [ -n "${TMUX:-}" ]; then
  # Running inside tmux: without forwarding the title never reaches the tab.
  set_titles=$(tmux show-options -g set-titles 2>/dev/null)
  case "$set_titles" in
    *on) ok "tmux set-titles is on (pane titles forwarded to the outer terminal)" ;;
    *) warn "tmux set-titles is off or unreadable: OSC 0 titles will not reach the tab" ;;
  esac
elif command -v tmux >/dev/null 2>&1 && tmux ls >/dev/null 2>&1; then
  set_titles=$(tmux show-options -g set-titles 2>/dev/null)
  case "$set_titles" in
    *on) ok "tmux set-titles is on" ;;
    *) info "tmux server reachable with set-titles off (optional; only needed to forward titles)" ;;
  esac
else
  info "tmux not detected (optional; only needed to forward titles to the outer terminal)"
fi

# --- Required snippets (always shown) ---
cat << 'EOF'

--- Optional Ghostty config for bell audio ---
# macOS: ~/Library/Application Support/com.mitchellh.ghostty/config
# Linux: ~/.config/ghostty/config
bell-features = no-system,audio,attention,title,no-border
bell-audio-path = /path/to/your-sound.aiff   # pick your own; Apple system sounds are copyrighted
bell-audio-volume = 0.5
EOF

cat << 'EOF'

--- Optional tmux config for title forwarding ---
# ~/.tmux.conf
set -g set-titles on
set -g set-titles-string "#{session_name} · #{pane_title}"
EOF

if [ "$warnings" -gt 0 ]; then
  printf '\nResult: %s warning(s) found (exit 1)\n' "$warnings"
  exit 1
fi
printf '\nResult: environment OK (exit 0)\n'
exit 0