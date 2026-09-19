import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const src = readFileSync(new URL("../src/title-utils.ts", import.meta.url), "utf8");
const { code } = await esbuild.transform(src, { loader: "ts", format: "esm", target: "node20" });
const utils = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const {
  DEFAULT_CONFIG,
  canWriteTerminal,
  normalizeConfig,
  renderSummaryTitle,
  sanitizeTerminalText,
  summarizePrompt,
  truncate,
} = utils;

const cases = [
  [
    "puedes añadir tests para el parser de markdown, por favor",
    "añadir tests para el parser de markdown",
  ],
  ["hola, quiero un resumen del proyecto", "quiero un resumen del proyecto"],
  [
    "Implement OSC 9;4 progress reporting like Claude",
    "Implement OSC 9;4 progress reporting like Claude",
  ],
  ["```js\nconst x = 1;\n```\nexplica este codigo", "explica este codigo"],
];
for (const [input, expected] of cases) {
  assert.equal(summarizePrompt(input, 48), expected, `prompt: ${input}`);
}

assert.equal(summarizePrompt("", 48), null);
assert.equal(summarizePrompt("   ", 48), null);

const out = summarizePrompt("a".repeat(60), 48);
assert.equal(out.length, 48);
assert.ok(out.endsWith("…"), "long prompt should be truncated with an ellipsis");

assert.equal(truncate("abc", 3), "abc");
assert.equal(truncate("abcd", 3), "ab…");

assert.equal(sanitizeTerminalText("safe\x07\x1b]52;c;payload\x07"), "safe]52;c;payload");
assert.equal(sanitizeTerminalText("first\nsecond\tthird"), "first second third");
assert.equal(sanitizeTerminalText("abc\u202Edef"), "abcdef");

assert.equal(canWriteTerminal("tui", true), true);
assert.equal(canWriteTerminal("tui", false), false);
assert.equal(canWriteTerminal("print", true), false);
assert.equal(canWriteTerminal("json", true), false);

const configured = normalizeConfig({
  prefix: "\x1bCustom\x07",
  maxTitle: 72,
  minSummaryPrompt: 4,
  progressKeepaliveMs: 2000,
  showCwd: true,
});
assert.deepEqual(configured, {
  prefix: "Custom",
  maxTitle: 72,
  minSummaryPrompt: 4,
  progressKeepaliveMs: 2000,
  showCwd: true,
});
assert.deepEqual(normalizeConfig({ maxTitle: 4, showCwd: "yes" }), DEFAULT_CONFIG);

const rendered = renderSummaryTitle(
  { ...DEFAULT_CONFIG, maxTitle: 16, showCwd: true },
  "·",
  "a summary that is too long",
  "a-very-long-directory"
);
assert.equal(rendered.length, 16);
assert.ok(!/[\x00-\x1F\x7F-\x9F]/.test(rendered));

await esbuild.build({
  entryPoints: [new URL("../extensions/tab-title-summary.ts", import.meta.url).pathname],
  bundle: true,
  external: ["@earendil-works/pi-coding-agent"],
  format: "esm",
  platform: "node",
  write: false,
});

console.log("all tests passed");
