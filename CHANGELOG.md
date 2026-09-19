# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/), and this project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Moved pure title/config logic to `src/title-utils.ts` and test it directly
  (no regex/eval extraction from bundled output).
- `scripts/check-env.sh` treats Ghostty and tmux as optional and only warns on
  real misconfiguration (tmux without title forwarding, macOS Ghostty too old
  for custom bell audio).

### Added

- Trusted per-project configuration via `.pi/pi-tab-summary.json`
  (`CONFIG_DIR_NAME` + `ctx.isProjectTrusted()`).
- GitHub Actions test workflow, npm publish allowlist (`files`), and repository
  metadata.

### Fixed

- All title values are sanitized (terminal/bidi control characters removed)
  before writing OSC 0.
- OSC 9;4 progress is emitted only in interactive TUI sessions with a TTY, so
  `--print`/`--json`/RPC output is never polluted.
- Progress pauses while a UI prompt waits for the human and resumes when it
  closes.
- Final title is truncated including the optional `showCwd` suffix.

## [0.1.0] - 2025-09-19

Initial release: Claude Code-style tab title summary from the user prompt,
with an OSC 9;4 progress indicator, Ghostty bell docs, and tmux forwarding docs.