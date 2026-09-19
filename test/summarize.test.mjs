import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const src = readFileSync(new URL("../extensions/tab-title-summary.ts", import.meta.url), "utf8");
const { code } = await esbuild.transform(src, { loader: "ts", format: "esm" });

// Extract the pure functions and evaluate them in isolation.
function grab(name) {
  const re = new RegExp(`^function ${name}\\([\\s\\S]*?\\n\\}$`, "m");
  const match = code.match(re);
  if (!match) throw new Error(`function ${name} not found in transformed source`);
  return match[0];
}

const truncateSrc = grab("truncate");
const summarizeSrc = grab("summarizePrompt");
const { truncate, summarizePrompt } = new Function(
  `${truncateSrc}\n${summarizeSrc}\nreturn { truncate, summarizePrompt };`
)();

// --- summarizePrompt ---

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

// --- truncate ---
assert.equal(truncate("abc", 3), "abc");
assert.equal(truncate("abcd", 3), "ab…");

console.log("all tests passed");