import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONFIG_DIR_NAME,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { normalizeConfig, type TitleConfig } from "./title-utils.ts";

export const PROJECT_CONFIG_FILE = "pi-tab-summary.json";

/**
 * Load project configuration only after Pi has trusted the project.
 * Malformed or absent configuration falls back to safe defaults.
 */
export function loadProjectConfig(ctx: ExtensionContext): TitleConfig {
  if (!ctx.isProjectTrusted()) return normalizeConfig(undefined);

  const configPath = join(ctx.cwd, CONFIG_DIR_NAME, PROJECT_CONFIG_FILE);
  if (!existsSync(configPath)) return normalizeConfig(undefined);

  try {
    return normalizeConfig(JSON.parse(readFileSync(configPath, "utf8")));
  } catch {
    return normalizeConfig(undefined);
  }
}
