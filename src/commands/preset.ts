import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { ForgeError } from "../core/errors.js";
import { getForgeCustomPresetDir } from "../core/preset-paths.js";

function toKebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    const templateFile = path.join(templateDir, "README.md.hbs");

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
      template: ./templates/README.md.hbs
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
