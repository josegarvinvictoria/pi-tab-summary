export interface TitleConfig {
  prefix: string;
  maxTitle: number;
  minSummaryPrompt: number;
  progressKeepaliveMs: number;
  showCwd: boolean;
}

export const DEFAULT_CONFIG: TitleConfig = {
  prefix: "π",
  maxTitle: 48,
  minSummaryPrompt: 28,
  progressKeepaliveMs: 4000,
  showCwd: false,
};

// Remove terminal controls (including ESC and BEL) and bidi controls, then
// normalize whitespace. This output is safe to embed inside OSC 0 titles.
export function sanitizeTerminalText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Clean a user prompt into a short task summary. Returns null when empty. */
export function summarizePrompt(prompt: string, max: number): string | null {
  const text = sanitizeTerminalText(prompt)
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

export function canWriteTerminal(mode: string, isTTY: boolean | undefined): boolean {
  return mode === "tui" && isTTY === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOption(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

/** Validate untrusted JSON configuration and return a fresh safe config. */
export function normalizeConfig(input: unknown): TitleConfig {
  const source = isRecord(input) ? input : {};
  const prefix = typeof source.prefix === "string"
    ? truncate(sanitizeTerminalText(source.prefix), 16)
    : DEFAULT_CONFIG.prefix;

  return {
    prefix,
    maxTitle: numberOption(source.maxTitle, DEFAULT_CONFIG.maxTitle, 16, 256),
    minSummaryPrompt: numberOption(
      source.minSummaryPrompt,
      DEFAULT_CONFIG.minSummaryPrompt,
      0,
      4096
    ),
    // Keep comfortably below Ghostty's ~15 s stale-progress timeout.
    progressKeepaliveMs: numberOption(
      source.progressKeepaliveMs,
      DEFAULT_CONFIG.progressKeepaliveMs,
      1000,
      10000
    ),
    showCwd: typeof source.showCwd === "boolean" ? source.showCwd : DEFAULT_CONFIG.showCwd,
  };
}

function finalizeTitle(value: string, config: TitleConfig): string {
  return truncate(sanitizeTerminalText(value), config.maxTitle);
}

export function renderBaseTitle(
  config: TitleConfig,
  session: string | undefined,
  cwd: string
): string {
  const core = session ? `${config.prefix} - ${session} - ${cwd}` : `${config.prefix} - ${cwd}`;
  return finalizeTitle(core, config);
}

export function renderSummaryTitle(
  config: TitleConfig,
  marker: string,
  summary: string,
  cwd: string
): string {
  const core = `${config.prefix} ${marker} ${summary}`;
  const title = config.showCwd ? `${core} · ${cwd}` : core;
  return finalizeTitle(title, config);
}
