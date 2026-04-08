import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { parse as parseYaml } from "yaml";
import { ForgeError } from "../core/errors.js";
import {
  findYamlFilesRecursive,
  getCustomPresetDirs,
  getForgeCustomPresetDir,
} from "../core/preset-paths.js";
import { getAvailablePresetsWithMeta } from "../core/engine.js";

function toKebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isBuiltinPresetIdentifier(identifier: string): boolean {
  const needle = identifier.trim().toLowerCase();
  if (!needle) return false;

  const builtins = getAvailablePresetsWithMeta().filter(
    (preset) => preset.source === "builtin",
  );

  for (const preset of builtins) {
    if (preset.name.toLowerCase() === needle) return true;

    for (const alias of preset.aliases ?? []) {
      if (alias.toLowerCase() === needle) return true;
    }
  }

  return false;
}

async function findMatchingCustomPresetFiles(identifier: string): Promise<string[]> {
  const needle = identifier.trim().toLowerCase();
  if (!needle) return [];

  const matches = new Set<string>();

  for (const dir of getCustomPresetDirs()) {
    if (!(await fs.pathExists(dir))) continue;

    const files = findYamlFilesRecursive(dir, 4);

    for (const fullPath of files) {
      try {
        const raw = await fs.readFile(fullPath, "utf-8");
        const parsed = parseYaml(raw) as Record<string, unknown>;
        const parsedName =
          typeof parsed.name === "string" ? parsed.name.trim().toLowerCase() : "";
        const aliases = normalizeAliases(parsed.aliases).map((alias) =>
          alias.toLowerCase(),
        );
        const fileStem = path.basename(fullPath, path.extname(fullPath)).toLowerCase();
        const dirName = path.basename(path.dirname(fullPath)).toLowerCase();

        if (
          parsedName === needle ||
          aliases.includes(needle) ||
          fileStem === needle ||
          dirName === needle
        ) {
          matches.add(fullPath);
        }
      } catch {
        // Ignore malformed custom presets while resolving removal target.
      }
    }
  }

  return [...matches];
}

export async function createPresetCommand(name: string) {
  try {
    const safeName = toKebabCase(name);

    if (!safeName) {
      throw new ForgeError("Preset name must include at least one letter or number.");
    }

    const presetsDir = getForgeCustomPresetDir();
    const presetDir = path.join(presetsDir, safeName);
    const presetPath = path.join(presetDir, "preset.yaml");
    const templateDir = path.join(presetDir, "templates");
    const templateFile = path.join(templateDir, "README.md.tpl");

    if (await fs.pathExists(presetDir)) {
      throw new ForgeError(`Preset already exists: ${presetDir}`);
    }

    const starter = `name: ${safeName}
description: "Custom preset created with Forge"
version: "1.0"
runtime: node
packageManager: npm

variables:
  project:
    type: string
    prompt: "Project name"
    default: "my-app"

steps:
  - run: npm init -y
  - file:
      path: README.md
      template: ./templates/README.md.tpl
      vars:
        project: "{{project}}"

postRun:
  - "cd {{project}}"
  - "npm run dev"
`;

    const starterTemplate = `# {{project}}

Generated with Forge custom preset \`{{project}}\`.
`;

    await fs.ensureDir(templateDir);
    await fs.writeFile(presetPath, starter, "utf-8");
    await fs.writeFile(templateFile, starterTemplate, "utf-8");

    console.log(chalk.green(`✔ Created custom preset: ${presetPath}`));
    console.log(chalk.gray("Run it with: forge-dev init " + safeName + " my-app"));
  } catch (error) {
    if (error instanceof ForgeError) {
      console.error(chalk.red(`✖ ${error.message}`));
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`✖ Failed to create preset: ${msg}`));
    }
    process.exit(1);
  }
}

export async function removePresetCommand(name: string) {
  try {
    const identifier = name.trim();

    if (!identifier) {
      throw new ForgeError("Preset name must include at least one letter or number.");
    }

    if (isBuiltinPresetIdentifier(identifier)) {
      throw new ForgeError(
        "Built-in presets cannot be removed. Remove custom presets only.",
      );
    }

    const matchingFiles = await findMatchingCustomPresetFiles(identifier);

    if (matchingFiles.length === 0) {
      throw new ForgeError(`Custom preset not found: ${identifier}`);
    }

    const removedLocations: string[] = [];

    for (const filePath of matchingFiles) {
      const fileName = path.basename(filePath).toLowerCase();
      if (fileName === "preset.yaml" || fileName === "preset.yml") {
        const presetDir = path.dirname(filePath);
        await fs.remove(presetDir);
        removedLocations.push(presetDir);
      } else {
        await fs.remove(filePath);
        removedLocations.push(filePath);
      }
    }

    if (removedLocations.length === 1) {
      console.log(chalk.green(`✔ Removed custom preset: ${removedLocations[0]}`));
      return;
    }

    console.log(
      chalk.green(
        `✔ Removed ${removedLocations.length} custom preset entries matching '${identifier}'.`,
      ),
    );
    removedLocations.forEach((location) => {
      console.log(chalk.gray(`  - ${location}`));
    });
  } catch (error) {
    if (error instanceof ForgeError) {
      console.error(chalk.red(`✖ ${error.message}`));
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`✖ Failed to remove preset: ${msg}`));
    }
    process.exit(1);
  }
}
