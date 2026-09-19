/**
 * Pi Tab Summary — Claude Code-style tab title + OSC 9;4 progress.
 *
 * Sets the terminal tab title to a task summary derived from the user's
 * prompt (like Claude Code's auto-generated conversation-summary title),
 * plus an OSC 9;4 indeterminate progress indicator while Pi is working.
 *
 * Title states (working marker "·", idle "✓", waiting-for-input "⏎"):
 *   working : π · <task summary>
 *   idle    : π ✓ <task summary>
 *   waiting : π ⏎ <task summary>
 *   no task : π - <session> - <cwd>
 *
 * OSC 9;4 keep-alive: Ghostty resets stale progress after ~15 s, so the
 * indicator is re-emitted every `progressKeepaliveMs` while a run is active
 * and cleared on settle.
 *
 * tmux: OSC 0 titles become tmux pane titles and are NOT forwarded to the
 * outer terminal unless you enable it (see README):
 *   set -g set-titles on
 *   set -g set-titles-string "#{session_name} · #{pane_title}"
 */

import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Public configuration — adjust to taste. */
const CONFIG = {
  /** Prefix before the summary. Change to "pi" or "" if you prefer. */
  prefix: "π",
  /** Max title length; terminals truncate the rest. */
  maxTitle: 48,
  /** Update the task summary only for prompts at least this long. */
  minSummaryPrompt: 28,
  /** OSC 9;4 keep-alive interval while working (Ghostty resets after ~15 s). */
  progressKeepaliveMs: 4000,
  /** Append the cwd basename so tabs of different projects stay distinguishable. */
  showCwd: false,
} as const;

const OSC94_SHOW = "\x1b]9;4;3\x07";
const OSC94_HIDE = "\x1b]9;4;0\x07";

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Clean a user prompt into a short task summary. Returns null when empty. */
function summarizePrompt(prompt: string, max: number): string | null {
  const text = prompt
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  const cleaned = text
    .replace(
      /^(hola|hey|oye|por\s*favor|please|puedes|podr[ií]as|podr[ií]a|can\s+you|could\s+you|me\s+ayudas|ay[uú]dame|quiero|necesito|hazme|haz|haceme)\b[,\s]*/i,
      ""
    )
    .replace(/(?:,?\s*(?:por\s*favor|please))$/i, "")
    .trim();
  return truncate(cleaned.length > 0 ? cleaned : text, max);
}

export default function tabTitleSummary(pi: ExtensionAPI): void {
  let summary: string | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;

  const baseTitle = (): string => {
    const cwd = path.basename(process.cwd());
    const session = pi.getSessionName();
    return session ? `${CONFIG.prefix} - ${session} - ${cwd}` : `${CONFIG.prefix} - ${cwd}`;
  };

  const render = (marker: string, text: string): string => {
    const core = `${CONFIG.prefix} ${marker} ${text}`;
    return CONFIG.showCwd ? `${core} · ${path.basename(process.cwd())}` : core;
  };

  const setTitle = (ctx: ExtensionContext, text: string): void => {
    ctx.ui.setTitle(text);
  };

  const hideProgress = (): void => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    process.stdout.write(OSC94_HIDE);
  };

  const startProgress = (): void => {
    hideProgress();
    process.stdout.write(OSC94_SHOW);
    progressTimer = setInterval(
      () => process.stdout.write(OSC94_SHOW),
      CONFIG.progressKeepaliveMs
    );
  };

  pi.on("before_agent_start", async (event, ctx) => {
    const derived = summarizePrompt(event.prompt ?? "", CONFIG.maxTitle);
    // Substantial new prompts update the task summary (like Claude's title);
    // short follow-ups ("dale", "sí") keep the existing summary.
    if (derived && (derived.length >= CONFIG.minSummaryPrompt || summary === null)) {
      summary = derived;
    }
    setTitle(ctx, summary ? render("·", summary) : baseTitle());
  });

  pi.on("agent_start", async () => {
    startProgress();
  });

  pi.on("ui_prompt_start", async (_event, ctx) => {
    setTitle(ctx, render("⏎", summary ?? "…"));
  });

  pi.on("agent_settled", async (_event, ctx) => {
    hideProgress();
    setTitle(ctx, summary ? render("✓", summary) : baseTitle());
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    hideProgress();
    ctx.ui.setTitle(baseTitle());
  });
}