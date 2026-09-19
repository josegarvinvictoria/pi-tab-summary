#!/bin/sh
# pi-tab-summary — environment check
# Verifies the pieces this package needs and prints the config snippets to add.
# Exit 0 when the environment looks ready, 1 when warnings were found.

set -u

warnings=0

warn() {
  echo "WARN: $1"
  warnings=$((warnings + 1))
}

ok() {
  echo "OK: $1"
}

# --- Ghostty ---
if command -v ghostty >/dev/null 2>&1; then
  version_line=$(ghostty --version 2>/dev/null | head -n 1)
  version=$(printf '%s' "$version_line" | sed -n 's/.*Ghostty \([0-9][0-9]*\.[0-9][0-9]*\).*/\1/p')
  if [ -z "$version" ]; then
    warn "could not parse Ghostty version from: $version_line"
  else
    major=$(printf '%s' "$version" | cut -d. -f1)
    minor=$(printf '%s' "$version" | cut -d. -f2)
    ok "Ghostty $version found"
    if [ "$major" -lt 1 ] || { [ "$major" -eq 1 ] && [ "$minor" -lt 3 ]; }; then
      warn "Ghostty < 1.3.0: custom bell audio (bell-audio-path) needs >= 1.3.0 on macOS"
    fi
  fi
else
  warn "ghostty binary not found (bell sound and OSC 9;4 progress are optional)"
fi

# --- tmux ---
tmux_seen=0
if [ -n "${TMUX:-}" ]; then
  tmux_seen=1
elif command -v tmux >/dev/null 2>&1 && tmux ls >/dev/null 2>&1; then
  tmux_seen=1
fi

if [ "$tmux_seen" -eq 1 ]; then
  set_titles=$(tmux show-options -g set-titles 2>/dev/null)
  case "$set_titles" in
    *on) ok "tmux set-titles is on (pane titles forwarded to Ghostty)" ;;
    *) warn "tmux set-titles is off or unreadable: OSC 0 titles will not reach the tab" ;;
  esac
else
  warn "no tmux server detected — title forwarding checks skipped"
fi

# --- Required snippets (always shown) ---
cat << 'EOF'

--- Required Ghostty config (~/.config/ghostty/config) ---
bell-features = no-system,audio,attention,title,no-border
bell-audio-path = /path/to/your-sound.aiff   # pick your own; Apple system sounds are copyrighted
bell-audio-volume = 0.5
EOF

cat << 'EOF'

--- Required tmux config (~/.tmux.conf) ---
set -g set-titles on
set -g set-titles-string "#{session_name} · #{pane_title}"
EOF

if [ "$warnings" -gt 0 ]; then
  printf '\nResult: %s warning(s) found (exit 1)\n' "$warnings"
  exit 1
fi
printf '\nResult: environment OK (exit 0)\n'
exit 0