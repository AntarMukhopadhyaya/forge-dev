import { ZodError } from "zod";
import { LoadedPreset, PresetSchema, Step } from "../types/schema.js";
import { logger } from "./logger.js";
import { ForgeError } from "./errors.js";
import { interpolate } from "../utils/interpolate.js";
import { parse as parseYaml } from "yaml";
import { executeStep } from "./runtime.js";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import stringSimilarity from "string-similarity";
import { fileURLToPath } from "node:url";
import { renderDryRunHeader, renderDryRunStep } from "./dry-run-renderer.js";
import { findYamlFilesRecursive, getCustomPresetDirs } from "./preset-paths.js";

type PresetSource = "builtin" | "custom";

interface PresetMeta {
  name: string;
  description: string;
  tags?: string[];
  source: PresetSource;
  path: string;
}

interface BuiltinMetaFile {
  name?: string;
  description?: string;
  tags?: string[];
}

/*
 * Get the path to built-in presets (works in dev and prod)
 */
function getBuiltinPresetDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const devPath = path.join(__dirname, "../../src/presets/builtins");
  const prodPath = path.join(__dirname, "../../presets/builtins");

  if (fs.existsSync(devPath)) return devPath;
  if (fs.existsSync(prodPath)) return prodPath;

  const cwdPath = path.join(process.cwd(), "presets/builtins");
  if (fs.existsSync(cwdPath)) return cwdPath;

  throw new ForgeError("Built-in presets directory not found");
}

function tryGetBuiltinPresetDir(): string | null {
  try {
    return getBuiltinPresetDir();
  } catch {
    return null;
  }
}

function getBuiltinPresetFiles(builtinDir: string): string[] {
  const yamlFiles = findYamlFilesRecursive(builtinDir, 6);

  return yamlFiles
    .filter((fullPath) => {
      const relative = path.relative(builtinDir, fullPath);
      const base = path.basename(fullPath).toLowerCase();

      if (!relative.includes(path.sep)) return true;

      return base === "preset.yaml" || base === "preset.yml";
    })
    .sort((a, b) => a.localeCompare(b));
}

function inferPresetNameFromPath(fullPath: string): string {
  const base = path.basename(fullPath).toLowerCase();
  if (base === "preset.yaml" || base === "preset.yml") {
    return path.basename(path.dirname(fullPath));
  }

  return path.parse(fullPath).name;
}

function getBuiltinAliasFromPath(fullPath: string): string | null {
  const base = path.basename(fullPath).toLowerCase();
  if (base === "preset.yaml" || base === "preset.yml") {
    return path.basename(path.dirname(fullPath));
  }

  return null;
}

function readBuiltinMetaFile(presetPath: string): BuiltinMetaFile | null {
  const base = path.basename(presetPath).toLowerCase();
  if (base !== "preset.yaml" && base !== "preset.yml") {
    return null;
  }

  const metaPath = path.join(path.dirname(presetPath), "meta.json");
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    const parsed = JSON.parse(raw) as BuiltinMetaFile;
    return parsed;
  } catch {
    return null;
  }
}

function getAllPresetMeta(): PresetMeta[] {
  const all: PresetMeta[] = [];
  const builtinDir = tryGetBuiltinPresetDir();

  if (builtinDir) {
    const builtinFiles = getBuiltinPresetFiles(builtinDir);

    for (const fullPath of builtinFiles) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsed = parseYaml(content) as Record<string, unknown>;
        const metaFile = readBuiltinMetaFile(fullPath);
        const metaName = typeof metaFile?.name === "string" ? metaFile.name : undefined;
        const metaDescription =
          typeof metaFile?.description === "string" ? metaFile.description : undefined;
        const tags = Array.isArray(metaFile?.tags)
          ? metaFile.tags.filter((tag): tag is string => typeof tag === "string")
          : undefined;

        all.push({
          name: String(metaName ?? parsed.name ?? inferPresetNameFromPath(fullPath)),
          description: String(metaDescription ?? parsed.description ?? "No description"),
          tags,
          source: "builtin",
          path: fullPath,
        });
      } catch {
        // Skip malformed built-ins to avoid blocking list rendering.
      }
    }
  }

  const seenCustomFiles = new Set<string>();

  for (const dir of getCustomPresetDirs()) {
    if (!fs.existsSync(dir)) continue;

    const customFiles = findYamlFilesRecursive(dir, 4);

    for (const fullPath of customFiles) {
      if (seenCustomFiles.has(fullPath)) continue;
      seenCustomFiles.add(fullPath);

      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsed = parseYaml(content) as Record<string, unknown>;

        all.push({
          name: String(parsed.name ?? path.parse(fullPath).name),
          description: String(parsed.description ?? "No description"),
          source: "custom",
          path: fullPath,
        });
      } catch {
        // Skip malformed custom presets in listing to keep CLI responsive.
      }
    }
  }

  return all;
}
/**
 * List all available built-in preset names
 */
export function getAvailablePresets(): string[] {
  const presets = getAllPresetMeta();

  try {
    const names = new Set<string>();

    for (const preset of presets) {
      names.add(preset.name);

      if (preset.source === "builtin") {
        const alias = getBuiltinAliasFromPath(preset.path);
        if (alias) {
          names.add(alias);
        }
      }
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}
export function getAvailablePresetsWithMeta() {
  return getAllPresetMeta().sort((a, b) => a.name.localeCompare(b.name));
}
/**
 * Load and validate a preset from built-in or file path.
 */
export async function loadPreset(presetName: string): Promise<LoadedPreset> {
  let yamlContent: string;
  let resolvedPath: string | null = null;

  const isPathLike =
    presetName.includes("/") ||
    presetName.includes("\\") ||
    presetName.endsWith(".yaml") ||
    presetName.endsWith(".yml");

  if (isPathLike && fs.existsSync(presetName)) {
    resolvedPath = presetName;
  }

  if (!resolvedPath) {
    const directCandidates = [`${presetName}.yaml`, `${presetName}.yml`];

    for (const dir of getCustomPresetDirs()) {
      for (const fileName of directCandidates) {
        const candidate = path.join(dir, fileName);
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
          break;
        }
      }
      if (resolvedPath) break;
    }

    if (!resolvedPath) {
      const target = presetName.toLowerCase();
      const seen = new Set<string>();

      for (const dir of getCustomPresetDirs()) {
        const customFiles = findYamlFilesRecursive(dir, 4);

        for (const fullPath of customFiles) {
          if (seen.has(fullPath)) continue;
          seen.add(fullPath);

          if (path.parse(fullPath).name.toLowerCase() === target) {
            resolvedPath = fullPath;
            break;
          }

          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const parsed = parseYaml(content) as Record<string, unknown>;
            if (String(parsed.name ?? "").toLowerCase() === target) {
              resolvedPath = fullPath;
              break;
            }
          } catch {
            // Ignore invalid yaml while searching for a match.
          }
        }

        if (resolvedPath) break;
      }
    }
  }

  if (!resolvedPath) {
    const builtinDir = tryGetBuiltinPresetDir();
    if (builtinDir) {
      const directCandidates = [
        path.join(builtinDir, `${presetName}.yaml`),
        path.join(builtinDir, `${presetName}.yml`),
        path.join(builtinDir, presetName, "preset.yaml"),
        path.join(builtinDir, presetName, "preset.yml"),
      ];

      for (const candidate of directCandidates) {
        if (fs.existsSync(candidate)) {
          resolvedPath = candidate;
          break;
        }
      }

      if (!resolvedPath) {
        const target = presetName.toLowerCase();
        const builtinFiles = getBuiltinPresetFiles(builtinDir);

        for (const fullPath of builtinFiles) {
          const baseName = path.parse(fullPath).name.toLowerCase();
          const folderName = path.basename(path.dirname(fullPath)).toLowerCase();

          if (baseName === target || folderName === target) {
            resolvedPath = fullPath;
            break;
          }

          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const parsed = parseYaml(content) as Record<string, unknown>;

            if (String(parsed.name ?? "").toLowerCase() === target) {
              resolvedPath = fullPath;
              break;
            }
          } catch {
            // Ignore malformed yaml while searching fallback built-ins.
          }
        }
      }
    }
  }

  if (resolvedPath) {
    yamlContent = await fs.readFile(resolvedPath, "utf-8");
  } else {
    // Not found – show helpful error
    const available = getAvailablePresets();
    const match = stringSimilarity.findBestMatch(presetName, available);
    let suggestion = "";
    if (match.bestMatch.rating > 0.4) {
      suggestion = `\nDid you mean "${match.bestMatch.target}"?\n`;
    }

    const errorMessage = `
${chalk.red("✖ Preset not found:")} ${chalk.bold(presetName)}${suggestion}

${chalk.yellow("Available presets:")}
${available.map((p) => `  • ${p}`).join("\n")}

${chalk.gray("Tip: run `forge-dev list` to see all presets")}
`;
    throw new ForgeError(errorMessage);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (err: any) {
    throw new ForgeError(`Invalid YAML in preset: ${presetName}`, {
      cause: err,
    });
  }

  try {
    const preset = PresetSchema.parse(parsed) as LoadedPreset;
    preset.sourcePath = resolvedPath ?? undefined;
    return preset;
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues
        .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      throw new ForgeError(`Preset validation failed:\n${issues}`);
    }
    throw err;
  }
}

/**
 * Execute all steps of a preset with  a given variables.
 */
export async function executeSteps(
  preset: LoadedPreset,
  variables: Record<string, string>,
  options: { dryRun?: boolean },
) {
  logger.info(`Executing preset: ${preset.name}...`);
  for (let i = 0; i < preset.steps.length; i++) {
    const step = preset.steps[i];
    const stepIndex = i + 1;
    if (!shouldRunStep(step, variables)) {
      logger.verbose(`Step ${stepIndex}: skipped (condition not met)`);
      continue;
    }
    // Interpolate variables in step
    const interpolatedStep = interpolateStep(step, variables);
    // Log what we're about to do
    logger.verbose(`Step ${stepIndex}: ${JSON.stringify(interpolatedStep)}`);

    if (options.dryRun) {
      if (i === 0) {
        renderDryRunHeader();
      }
      renderDryRunStep(interpolatedStep, stepIndex);

      continue;
    }
    // Execute
    try {
      await executeStep(interpolatedStep, preset, variables);
    } catch (err: any) {
      const causeMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Unknown error";

      throw new ForgeError(`Step ${stepIndex} failed: ${causeMessage}`, {
        cause: err,
        step: interpolatedStep,
      });
    }
  }
}

/**
 * Determine if a step shoud run based on its 'if' condition.
 */
function shouldRunStep(step: Step, variables: Record<string, string>): boolean {
  if (!step.if) return true;
  const [key, value] = Object.entries(step.if)[0];
  return variables[key] === value;
}
/**
 *
 * Recursively interpolate strings in a step object.
 */
function interpolateStep(step: Step, vars: Record<string, any>): Step {
  // If step is an object (which it always is for a root step)
  if (step && typeof step === "object" && !Array.isArray(step)) {
    const result: any = {};
    for (const [key, value] of Object.entries(step)) {
      if (typeof value === "string") {
        // Interpolate strings directly
        result[key] = interpolate(value, vars);
      } else if (Array.isArray(value)) {
        // Process arrays (e.g., deps list)
        result[key] = value.map((item) =>
          typeof item === "string" ? interpolate(item, vars) : item,
        );
      } else if (value && typeof value === "object") {
        // Recursively handle nested objects (e.g., file.vars)
        result[key] = interpolateStep(value as any, vars);
      } else {
        result[key] = value;
      }
    }
    return result as Step;
  }

  // For safety, if step is an array (shouldn't happen for root), process it
  if (Array.isArray(step)) {
    return step.map((item) => interpolateStep(item as any, vars)) as any as Step;
  }

  // Fallback: if step is a primitive (like a string), just return it
  // But this should never happen for the root step
  return step as Step;
}
