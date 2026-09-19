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
- OSC 9;4 indeterminate progress indicator (a bar on the split in Ghostty)
  while a run is active, with keep-alive (Ghostty resets stale progress
  after ~15 s) and cleared on settle.
- Follow-ups that are short ("ok", "go on") keep the existing summary, so a
  single task does not clobber its title mid-conversation.
- `showCwd` option to keep tabs of different projects distinguishable.

## Requirements

- Pi >= 0.85 (uses stable extension events: `before_agent_start`,
  `agent_start`, `ui_prompt_start`, `agent_settled`, `session_shutdown`).
- Ghostty (optional): OSC 9;4 progress bar and bell sound.
- tmux (optional): only needed to forward titles to the outer terminal.

## Install

```bash
pi install git:github.com/josegarvinvictoria/pi-tab-summary
pi install /path/to/pi-tab-summary        # or from a local checkout
pi -e git:github.com/josegarvinvictoria/pi-tab-summary   # try without installing
```

Then restart Pi.

## Setup

### Ghostty — bell sound (optional)

Add to `~/.config/ghostty/config`:

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

### tmux — forward titles to Ghostty (only if you run Pi inside tmux)

Add to `~/.tmux.conf`:

```
set -g set-titles on
set -g set-titles-string "#{session_name} · #{pane_title}"
```

tmux captures OSC 0 titles as pane titles and does **not** forward them to
the outer terminal unless `set-titles` is on.

### macOS — notifications (for the companion extension below)

System Settings → Notifications → Ghostty → enable banners.

## Companion: native notifications

The official Pi example `examples/extensions/notify.ts` (under the Pi
installation, e.g. `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/notify.ts`)
sends a native desktop notification when Pi is done and waiting for input
(OSC 777 — supported by Ghostty, iTerm2, WezTerm; OSC 99 for Kitty). It is
deliberately **not** bundled here — reference it directly.

## Configuration

Edit `CONFIG` at the top of `extensions/tab-title-summary.ts`:

| Key                  | Default | Meaning                                                    |
| -------------------- | ------- | ---------------------------------------------------------- |
| `prefix`             | `"π"`   | Prefix shown before the summary                            |
| `maxTitle`           | `48`    | Max title length; terminals truncate the rest              |
| `minSummaryPrompt`   | `28`    | Minimum prompt length before the summary is updated        |
| `progressKeepaliveMs`| `4000`  | OSC 9;4 keep-alive interval while working                  |
| `showCwd`            | `false` | Append the cwd basename so tabs stay distinguishable       |

## Troubleshooting

- **OSC 9;4 progress disappears after ~15 s** — expected Ghostty behavior
  for stale progress; the keep-alive re-emits while a run is active.
- **Progress conflicts with Pi's `terminal.showTerminalProgress` setting**
  — that Pi setting (off by default) also emits OSC 9;4; keep it off to
  avoid fighting over the indicator.
- **Tab title not updating in Ghostty+tmux** — `set-titles` is off; add the
  tmux lines above.
- **Notifications not appearing** — macOS notification permission for
  Ghostty is not granted.
- **No bell sound** — Ghostty < 1.3.0 on macOS (custom audio), or a bad
  `bell-audio-path`.

## Compatibility

Tested with Pi 0.85.x and Ghostty 1.3.x. Ghostty renders OSC 9;4 as a bar
on the split only — it has no text parameter, so the visible text always
comes from the title (OSC 0).

## License

MIT