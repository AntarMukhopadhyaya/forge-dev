import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { parse as parseYaml } from "yaml";
import { ForgeError } from "./errors.js";
import { PresetSchema, type Step } from "../types/schema.js";
import { findYamlFilesRecursive, getForgeCustomPresetDir } from "./preset-paths.js";

interface ParsedGitHubPresetSpecifier {
  owner: string;
  repo: string;
  ref?: string;
  subPath?: string;
}

function sanitizePresetKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isGitHubPresetSpecifier(value: string): boolean {
  return /(^https:\/\/github\.com\/)|(^github\.com\/)/i.test(value.trim());
}

function parseGitHubPresetSpecifier(value: string): ParsedGitHubPresetSpecifier {
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch (error) {
    throw new ForgeError(`Invalid GitHub preset URL: ${value}`, {
      cause: error as Error,
    });
  }

  if (parsed.hostname.toLowerCase() !== "github.com") {
    throw new ForgeError(
      "Only github.com URLs are supported for trusted remote presets.",
    );
  }

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new ForgeError(
      "GitHub preset URL must include owner and repository, e.g. github.com/owner/repo",
    );
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, "");

  let ref: string | undefined;
  let subPath: string | undefined;

  if ((parts[2] === "tree" || parts[2] === "blob") && parts.length >= 4) {
    ref = parts[3];
    if (parts.length >= 5) {
      subPath = parts.slice(4).join("/");
    }
  } else if (parts.length >= 3) {
    subPath = parts.slice(2).join("/");
  }

  return { owner, repo, ref, subPath };
}

async function detectPresetFile(rootDir: string, subPath?: string): Promise<string> {
  const searchRoot = subPath ? path.resolve(rootDir, subPath) : rootDir;

  if (!(await fs.pathExists(searchRoot))) {
    throw new ForgeError(`Remote preset path not found in repository: ${subPath}`);
  }

  const stats = await fs.stat(searchRoot);
  if (stats.isFile() && (searchRoot.endsWith(".yaml") || searchRoot.endsWith(".yml"))) {
    return searchRoot;
  }

  const dir = stats.isDirectory() ? searchRoot : path.dirname(searchRoot);
  const preferredNames = [
    "preset.yaml",
    "preset.yml",
    "forge.yaml",
    "forge.yml",
    "forge-preset.yaml",
    "forge-preset.yml",
  ];

  for (const fileName of preferredNames) {
    const candidate = path.join(dir, fileName);
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  const yamlFiles = findYamlFilesRecursive(dir, 4);
  const validPresetFiles: string[] = [];

  for (const yamlFile of yamlFiles) {
    try {
      const content = await fs.readFile(yamlFile, "utf-8");
      const parsed = parseYaml(content);
      if (PresetSchema.safeParse(parsed).success) {
        validPresetFiles.push(yamlFile);
      }
    } catch {
      // Ignore invalid yaml files during discovery.
    }
  }

  if (validPresetFiles.length === 0) {
    throw new ForgeError(
      "No valid Forge preset YAML was found in the GitHub repository.",
    );
  }

  return validPresetFiles[0];
}

function getLocalTemplateRefs(steps: Step[]): string[] {
  const refs: string[] = [];

  for (const step of steps) {
    if (!("file" in step)) continue;

    const template = step.file.template;
    if (path.isAbsolute(template)) continue;

    if (template.startsWith(".") || template.includes("/") || template.includes("\\")) {
      refs.push(template);
    }
  }

  return refs;
}

export async function cacheCustomPresetBundle(
  sourcePresetPath: string,
  keyHint?: string,
): Promise<{ storedPresetPath: string; presetName: string }> {
  const raw = await fs.readFile(sourcePresetPath, "utf-8");
  const parsed = parseYaml(raw);
  const validated = PresetSchema.safeParse(parsed);

  if (!validated.success) {
    throw new ForgeError("Cannot cache preset bundle because preset is invalid.");
  }

  const presetName = validated.data.name;
  const storageKey = sanitizePresetKey(keyHint ?? presetName);

  if (!storageKey) {
    throw new ForgeError("Could not determine a valid storage key for preset cache.");
  }

  const targetDir = path.join(getForgeCustomPresetDir(), storageKey);
  await fs.remove(targetDir);
  await fs.ensureDir(targetDir);

  const targetPresetPath = path.join(targetDir, "preset.yaml");
  await fs.writeFile(targetPresetPath, raw, "utf-8");

  const sourceDir = path.dirname(sourcePresetPath);

  const siblingTemplates = path.join(sourceDir, "templates");
  if (await fs.pathExists(siblingTemplates)) {
    await fs.copy(siblingTemplates, path.join(targetDir, "templates"));
  }

  for (const relativeTemplate of getLocalTemplateRefs(validated.data.steps)) {
    const sourceTemplatePath = path.resolve(sourceDir, relativeTemplate);
    if (!(await fs.pathExists(sourceTemplatePath))) continue;

    const normalized = relativeTemplate.replace(/\\/g, "/");
    const destination = path.resolve(targetDir, normalized);

    if (!destination.startsWith(targetDir)) {
      continue;
    }

    await fs.ensureDir(path.dirname(destination));
    await fs.copy(sourceTemplatePath, destination);
  }

  return { storedPresetPath: targetPresetPath, presetName };
}

export async function cachePresetFromGitHub(
  value: string,
): Promise<{ storedPresetPath: string; presetName: string; source: string }> {
  const spec = parseGitHubPresetSpecifier(value);
  const cloneDir = await fs.mkdtemp(path.join(os.tmpdir(), "forge-remote-preset-"));

  const repoUrl = `https://github.com/${spec.owner}/${spec.repo}.git`;

  try {
    const cloneArgs = ["clone", "--depth", "1"];

    if (spec.ref) {
      cloneArgs.push("--branch", spec.ref);
    }

    cloneArgs.push(repoUrl, cloneDir);

    await execa("git", cloneArgs, { stdio: "pipe" });

    const presetFile = await detectPresetFile(cloneDir, spec.subPath);
    const keyHint = `${spec.owner}-${spec.repo}`;

    const cached = await cacheCustomPresetBundle(presetFile, keyHint);

    return {
      storedPresetPath: cached.storedPresetPath,
      presetName: cached.presetName,
      source: `${spec.owner}/${spec.repo}`,
    };
  } catch (error) {
    throw new ForgeError(`Failed to fetch preset from ${repoUrl}`, {
      cause: error as Error,
    });
  } finally {
    await fs.remove(cloneDir);
  }
}
