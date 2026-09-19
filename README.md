# Pi Tab Summary

Claude Code-style **tab title summary** for Pi: the terminal tab shows a short
summary of the task derived from your prompt, plus an OSC 9;4 progress
indicator while Pi is working.

```
working : π · add tests for the markdown parser
idle    : π ✓ add tests for the markdown parser
waiting : π ⏎ add tests for the markdown parser   (Pi asks you for input)
no task : π - <session> - <cwd>
```

## Features

- Tab title updated from your prompt: a cleaned, truncated task summary
  (same idea as Claude Code's auto-generated conversation-summary title).
- OSC 9;4 indeterminate progress indicator while a run is active, with
  keep-alive (Ghostty resets stale progress after ~15 s) and cleared on
  settle; paused while Pi waits for your input.
- Short follow-ups ("ok", "go on") keep the existing summary, so a single
  task does not clobber its title mid-conversation.
- Optional `showCwd` suffix to keep tabs of different projects
  distinguishable.
- Per-project configuration via a trusted dotfile (no editing of installed
  code; survives `pi update`).

## Scope

| Capability | Where it shows | Needed |
| --- | --- | --- |
| Task summary in the tab title | Any terminal (OSC 0) | Nothing |
| Progress indicator | Bar on the split (Ghostty; also iTerm2/WezTerm support OSC 9;4, rendered differently) | OSC 9;4 support |
| Title reaches an outer tab | tmux → Ghostty | tmux `set-titles` forwarding |
| Bell sound when the terminal bell rings | Ghostty | Ghostty config + sound file |
| Native "Pi ready" notification | macOS/desktop | Companion extension `notify.ts` |

Raw terminal output (OSC sequences) is emitted **only** in interactive TUI
mode with a TTY; `pi -p`, JSON, and RPC output are never polluted.

## Requirements

- Pi >= 0.85 (events: `session_start`, `before_agent_start`, `agent_start`,
  `ui_prompt_start`, `ui_prompt_end`, `agent_settled`, `session_shutdown`;
  project trust via `ctx.isProjectTrusted()`).
- Ghostty, tmux, etc. are **optional** — see the scope table.

## Install

```bash
pi install git:github.com/josegarvinvictoria/pi-tab-summary
# pin a specific release:
pi install git:github.com/josegarvinvictoria/pi-tab-summary@v0.1.0
pi -e git:github.com/josegarvinvictoria/pi-tab-summary   # try without installing
```

Then restart Pi.

## Configuration

Create a trusted project file so the settings survive `pi update` and stay
per-project:

`.pi/pi-tab-summary.json`

```json
{
  "prefix": "π",
  "maxTitle": 48,
  "minSummaryPrompt": 28,
  "progressKeepaliveMs": 4000,
  "showCwd": false
}
```

The file is read only after Pi has trusted the project. Values are validated
and out-of-range or malformed entries fall back to defaults.

| Key                  | Default | Meaning                                                    |
| -------------------- | ------- | ---------------------------------------------------------- |
| `prefix`             | `"π"`   | Prefix shown before the summary                            |
| `maxTitle`           | `48`    | Max title length (16–256); terminals truncate the rest     |
| `minSummaryPrompt`   | `28`    | Minimum prompt length before the summary is updated        |
| `progressKeepaliveMs`| `4000`  | OSC 9;4 keep-alive interval while working (1000–10000)     |
| `showCwd`            | `false` | Append the cwd basename so tabs stay distinguishable       |

Every value is optional; omit keys you do not want to change.

## Setup

### Feed the tab title through tmux (optional, only when using tmux)

Add to `~/.tmux.conf`:

```
set -g set-titles on
set -g set-titles-string "#{session_name} · #{pane_title}"
```

tmux captures OSC 0 titles as pane titles and does **not** forward them to
the outer terminal unless `set-titles` is on.

### Ghostty bell sound (optional)

Add to your Ghostty config (`~/.config/ghostty/config` on Linux, or
`~/Library/Application Support/com.mitchellh.ghostty/config` on macOS):

```
bell-features = no-system,audio,attention,title,no-border
bell-audio-path = /path/to/your-sound.aiff
bell-audio-volume = 0.5
```

- macOS needs Ghostty >= 1.3.0 for `audio`.
- Pick your own sound file — Apple's system sounds (`/System/Library/Sounds/*`)
  are copyrighted; copy one or use a sound you have rights to.
- The bell fires when the terminal bell rings in your stack (that is what
  shows the 🔔 on the tab). This extension does not ring the bell itself.

### Native "Pi ready" notification (optional)

Install the official Pi companion example `notify.ts` (shipped with Pi as
`examples/extensions/notify.ts`; not bundled here on purpose). It sends a
native desktop notification when Pi is done and waiting for input — OSC 777
(supported by Ghostty, iTerm2, WezTerm) and OSC 99 (Kitty). On macOS, enable
banners for Ghostty in System Settings → Notifications.

## Troubleshooting

- **Title stays `π - <session> - <cwd>`** — no task summary yet, or the
  project config file is untrusted (`pi` must trust the project first).
- **OSC 9;4 progress disappears after ~15 s** — expected Ghostty behavior
  for stale progress; the keep-alive re-emits while a run is active.
- **Progress conflicts with Pi's `terminal.showTerminalProgress` setting**
  — that Pi setting (off by default) also emits OSC 9;4; keep it off to
  avoid fighting over the indicator.
- **Tab title not updating in Ghostty+tmux** — `set-titles` is off; add the
  tmux lines above.
- **No bell sound** — Ghostty < 1.3.0 on macOS (custom audio), a bad
  `bell-audio-path`, or nothing rings the terminal bell in your stack.
- **Notifications not appearing** — macOS notification permission for
  Ghostty is not granted.

## Compatibility

Tested with Pi 0.85.x and Ghostty 1.3.x. Ghostty renders OSC 9;4 as a bar on
the split only — it has no text parameter, so the visible text always comes
from the title (OSC 0).

## License

MIT