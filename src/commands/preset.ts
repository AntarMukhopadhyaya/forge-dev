import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import prompts from "prompts";
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

function getWorkspaceCustomPresetDir(cwd: string = process.cwd()): string {
  return path.join(cwd, "presets", "custom");
}

type ScaffoldPresetOptions = {
  runtime?: string;
  language?: string;
  packageManager?: string;
  installCommand?: string;
  yes?: boolean;
};

type ResolvedScaffoldPresetOptions = {
  runtime: string;
  language?: string;
  packageManager?: string;
  installCommand?: string;
};

const runtimeChoices = [
  { title: "Node.js", value: "node" },
  { title: "Flutter", value: "flutter" },
  { title: "Python", value: "python" },
  { title: "Go", value: "go" },
  { title: "Other", value: "other" },
];

function getDefaultLanguage(runtime: string): string | undefined {
  switch (runtime) {
    case "flutter":
      return "dart";
    case "python":
      return "python";
    case "go":
      return "go";
    default:
      return undefined;
  }
}

function getDefaultPackageManager(runtime: string): string | undefined {
  switch (runtime) {
    case "node":
      return "npm";
    case "flutter":
      return "pub";
    case "python":
      return "pip";
    case "go":
      return "go";
    default:
      return undefined;
  }
}

function getDefaultInstallCommand(runtime: string): string | undefined {
  switch (runtime) {
    case "flutter":
      return "flutter pub add";
    case "python":
      return "pip install";
    case "go":
      return "go get";
    default:
      return undefined;
  }
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function promptText(
  name: string,
  message: string,
  initial?: string,
): Promise<string | undefined> {
  const response = await prompts({
    type: "text",
    name,
    message,
    initial,
  });

  if (!response || response[name] === undefined) {
    throw new ForgeError("Preset scaffold was cancelled.");
  }

  return normalizeText(response[name]);
}

async function promptSelect(
  name: string,
  message: string,
  choices: Array<{ title: string; value: string }>,
  initial = 0,
): Promise<string> {
  const response = await prompts({
    type: "select",
    name,
    message,
    choices,
    initial,
  });

  if (!response || response[name] === undefined) {
    throw new ForgeError("Preset scaffold was cancelled.");
  }

  return String(response[name]);
}

async function resolveScaffoldPresetOptions(
  options: ScaffoldPresetOptions,
): Promise<ResolvedScaffoldPresetOptions> {
  const interactive = !options.yes && process.stdin.isTTY && process.stdout.isTTY;

  const runtime =
    options.runtime ??
    (interactive
      ? await promptSelect("runtime", "Choose a runtime", runtimeChoices)
      : "node");

  const resolved: ResolvedScaffoldPresetOptions = {
    runtime,
    language: options.language,
    packageManager: options.packageManager,
    installCommand: options.installCommand,
  };

  if (!interactive) {
    resolved.language = resolved.language ?? getDefaultLanguage(runtime);
    resolved.packageManager =
      resolved.packageManager ?? getDefaultPackageManager(runtime);
    resolved.installCommand =
      resolved.installCommand ?? getDefaultInstallCommand(runtime);
    return resolved;
  }

  if (!resolved.language) {
    resolved.language = await promptText(
      "language",
      `Language for ${runtime} presets`,
      getDefaultLanguage(runtime),
    );
  }

  if (!resolved.packageManager) {
    if (runtime === "node") {
      resolved.packageManager = await promptSelect(
        "packageManager",
        "Choose a package manager",
        [
          { title: "npm", value: "npm" },
          { title: "pnpm", value: "pnpm" },
          { title: "yarn", value: "yarn" },
        ],
      );
    } else {
      resolved.packageManager = await promptText(
        "packageManager",
        `Package manager for ${runtime} presets`,
        getDefaultPackageManager(runtime),
      );
    }
  }

  if (!resolved.installCommand && runtime !== "node") {
    resolved.installCommand = await promptText(
      "installCommand",
      `Install command for ${runtime} presets`,
      getDefaultInstallCommand(runtime),
    );
  }

  return resolved;
}

function buildStarterPresetYaml(
  presetName: string,
  options: {
    runtime: string;
    language?: string;
    packageManager?: string;
    installCommand?: string;
  },
): string {
  const metadata: string[] = [];

  metadata.push(`runtime: ${options.runtime}`);

  if (options.language) {
    metadata.push(`language: ${options.language}`);
  }

  if (options.packageManager) {
    metadata.push(`packageManager: ${options.packageManager}`);
  }

  const setupStep = options.installCommand
    ? `  - install:\n      command: ${JSON.stringify(options.installCommand)}\n      deps: [example-dependency]\n`
    : options.runtime === "node"
      ? `  - run: ${options.packageManager === "pnpm" ? "pnpm" : options.packageManager === "yarn" ? "yarn" : "npm"} init -y\n`
      : "";

  const postRun =
    options.runtime === "node"
      ? `\npostRun:\n  - "cd {{project}}"\n  - "${options.packageManager === "pnpm" ? "pnpm" : options.packageManager === "yarn" ? "yarn" : "npm"} run dev"\n`
      : "";

  return `name: ${presetName}
description: "Custom preset created with Forge"
version: "1.0"
${metadata.join("\n")}

variables:
  project:
    type: string
    prompt: "Project name"
    default: "my-app"

steps:
${setupStep}  - file:
      path: README.md
      template: ./templates/README.md.tpl
      vars:
        project: "{{project}}"
${postRun}`;
}

function buildStarterMetaJson(presetName: string): string {
  return `${JSON.stringify(
    {
      name: presetName,
      description: "Custom preset created with Forge",
      tags: ["custom"],
    },
    null,
    2,
  )}\n`;
}

function buildStarterTemplate(): string {
  return `# {{project}}

Generated with Forge custom preset \`{{project}}\`.
`;
}

async function scaffoldPresetModule(
  name: string,
  rootDir: string,
  opts: {
    locationLabel: string;
    commandExample: string;
    runtime?: string;
    language?: string;
    packageManager?: string;
    installCommand?: string;
  },
) {
  const safeName = toKebabCase(name);

  if (!safeName) {
    throw new ForgeError("Preset name must include at least one letter or number.");
  }

  const presetDir = path.join(rootDir, safeName);
  const presetPath = path.join(presetDir, "preset.yaml");
  const metaPath = path.join(presetDir, "meta.json");
  const templateDir = path.join(presetDir, "templates");
  const templateFile = path.join(templateDir, "README.md.tpl");

  if (await fs.pathExists(presetDir)) {
    throw new ForgeError(`Preset already exists: ${presetDir}`);
  }

  await fs.ensureDir(templateDir);
  await fs.writeFile(
    presetPath,
    buildStarterPresetYaml(safeName, {
      runtime: opts.runtime ?? "node",
      language: opts.language,
      packageManager: opts.packageManager,
      installCommand: opts.installCommand,
    }),
    "utf-8",
  );
  await fs.writeFile(metaPath, buildStarterMetaJson(safeName), "utf-8");
  await fs.writeFile(templateFile, buildStarterTemplate(), "utf-8");

  console.log(chalk.green(`✔ Created ${opts.locationLabel} preset: ${presetPath}`));
  console.log(chalk.gray(`Run it with: ${opts.commandExample}`));
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

export async function createPresetCommand(
  name: string,
  options: ScaffoldPresetOptions = {},
) {
  try {
    const scaffoldOptions = await resolveScaffoldPresetOptions(options);
    const safeName = toKebabCase(name);
    await scaffoldPresetModule(name, getForgeCustomPresetDir(), {
      locationLabel: "custom",
      commandExample: `forge-dev init ${safeName} my-app`,
      runtime: scaffoldOptions.runtime,
      language: scaffoldOptions.language,
      packageManager: scaffoldOptions.packageManager,
      installCommand: scaffoldOptions.installCommand,
    });
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

export async function scaffoldPresetCommand(
  name: string,
  options: ScaffoldPresetOptions = {},
) {
  try {
    const scaffoldOptions = await resolveScaffoldPresetOptions(options);
    const safeName = toKebabCase(name);
    await scaffoldPresetModule(name, getWorkspaceCustomPresetDir(), {
      locationLabel: "workspace",
      commandExample: `forge-dev init ${safeName} my-app`,
      runtime: scaffoldOptions.runtime,
      language: scaffoldOptions.language,
      packageManager: scaffoldOptions.packageManager,
      installCommand: scaffoldOptions.installCommand,
    });
  } catch (error) {
    if (error instanceof ForgeError) {
      console.error(chalk.red(`✖ ${error.message}`));
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`✖ Failed to scaffold preset: ${msg}`));
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
