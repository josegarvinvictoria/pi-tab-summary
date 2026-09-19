/**
 * Pi Tab Summary — Claude Code-style tab title + OSC 9;4 progress.
 *
 * The title is a task summary derived from the user's prompt. Raw terminal
 * output is emitted only for interactive TUI sessions, so print/JSON/RPC
 * output is never polluted with OSC sequences.
 *
 * tmux: OSC 0 titles become tmux pane titles and are not forwarded to the
 * outer terminal unless you enable it (see README):
 *   set -g set-titles on
 *   set -g set-titles-string "#{session_name} · #{pane_title}"
 */

import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadProjectConfig } from "../src/project-config.ts";
import {
  canWriteTerminal,
  DEFAULT_CONFIG,
  renderBaseTitle,
  renderSummaryTitle,
  summarizePrompt,
  type TitleConfig,
} from "../src/title-utils.ts";

const OSC94_SHOW = "\x1b]9;4;3\x07";
const OSC94_HIDE = "\x1b]9;4;0\x07";

export default function tabTitleSummary(pi: ExtensionAPI): void {
  let config: TitleConfig = { ...DEFAULT_CONFIG };
  let summary: string | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let terminalEnabled = false;
  let runActive = false;
  let cwd = process.cwd();

  const cwdBasename = (): string => path.basename(cwd);

  const updateTerminalMode = (ctx: ExtensionContext): void => {
    terminalEnabled = canWriteTerminal(ctx.mode, process.stdout.isTTY);
  };

  const baseTitle = (): string =>
    renderBaseTitle(config, pi.getSessionName(), cwdBasename());

  const setTitle = (ctx: ExtensionContext, title: string): void => {
    updateTerminalMode(ctx);
    if (terminalEnabled) ctx.ui.setTitle(title);
  };

  const hideProgress = (): void => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (terminalEnabled) process.stdout.write(OSC94_HIDE);
  };

  const startProgress = (): void => {
    hideProgress();
    if (!terminalEnabled) return;
    process.stdout.write(OSC94_SHOW);
    progressTimer = setInterval(
      () => process.stdout.write(OSC94_SHOW),
      config.progressKeepaliveMs
    );
  };

  const workingTitle = (): string =>
    summary ? renderSummaryTitle(config, "·", summary, cwdBasename()) : baseTitle();

  pi.on("session_start", async (_event, ctx) => {
    updateTerminalMode(ctx);
    hideProgress();
    cwd = ctx.cwd;
    config = loadProjectConfig(ctx);
    summary = null;
    runActive = false;
    setTitle(ctx, baseTitle());
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const derived = summarizePrompt(event.prompt ?? "", config.maxTitle);
    // Substantial prompts update the summary; short follow-ups preserve it.
    if (derived && (derived.length >= config.minSummaryPrompt || summary === null)) {
      summary = derived;
    }
    setTitle(ctx, workingTitle());
  });

  pi.on("agent_start", async (_event, ctx) => {
    updateTerminalMode(ctx);
    runActive = true;
    startProgress();
  });

  pi.on("ui_prompt_start", async (_event, ctx) => {
    updateTerminalMode(ctx);
    hideProgress();
    setTitle(
      ctx,
      renderSummaryTitle(config, "⏎", summary ?? "…", cwdBasename())
    );
  });

  pi.on("ui_prompt_end", async (_event, ctx) => {
    updateTerminalMode(ctx);
    setTitle(ctx, workingTitle());
    if (runActive) startProgress();
  });

  pi.on("agent_settled", async (_event, ctx) => {
    updateTerminalMode(ctx);
    runActive = false;
    hideProgress();
    setTitle(
      ctx,
      summary ? renderSummaryTitle(config, "✓", summary, cwdBasename()) : baseTitle()
    );
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    updateTerminalMode(ctx);
    runActive = false;
    hideProgress();
    setTitle(ctx, baseTitle());
  });
}
