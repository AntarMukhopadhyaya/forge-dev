import path from "path";
import { executeSteps, loadPreset } from "../core/engine.js";
import { ForgeError } from "../core/errors.js";
import { logger } from "../core/logger.js";
import { collectVariables } from "../utils/prompts.js";
import fs from "fs-extra";
import { showPostRunInstructions } from "../utils/display.js";
import chalk from "chalk";
import {
  cacheCustomPresetBundle,
  cachePresetFromGitHub,
  isGitHubPresetSpecifier,
} from "../core/remote-presets.js";
export async function initCommand(
  presetName: string,
  project: string | undefined,
  options: { dryRun?: boolean; verbose?: boolean; yes?: boolean; trust?: boolean },
) {
  if (options.verbose) logger.setLevel("verbose");

  try {
    let presetToLoad = presetName;
    let shouldCachePathPreset = true;
    const isPathLike =
      presetName.includes("/") ||
      presetName.includes("\\") ||
      presetName.endsWith(".yaml") ||
      presetName.endsWith(".yml");

    if (isGitHubPresetSpecifier(presetName)) {
      if (!options.trust) {
        throw new ForgeError(
          "Remote GitHub presets require --trust. Example: forge init github.com/owner/repo my-app --trust",
        );
      }

      const cached = await cachePresetFromGitHub(presetName);
      logger.info(
        `Trusted remote preset cached from ${cached.source} (${cached.presetName})`,
      );
      presetToLoad = cached.storedPresetPath;
      shouldCachePathPreset = false;
    }

    const preset = await loadPreset(presetToLoad);

    if (isPathLike && shouldCachePathPreset && preset.sourcePath) {
      const cached = await cacheCustomPresetBundle(preset.sourcePath);
      logger.verbose(`Cached custom preset bundle: ${cached.storedPresetPath}`);
    }

    const variables = await collectVariables(preset.variables, {
      project: project || preset.variables?.project?.default,
      skipPrompts: options.yes,
    });
    if (!variables.project) {
      throw new ForgeError(
        "Project name is required. Provide [project-name] argument or set a default in preset variables.",
      );
    }
    const projectPath = path.resolve(process.cwd(), variables.project);
    if (!options.dryRun) {
      await fs.ensureDir(projectPath);
      process.chdir(projectPath);
      logger.info(`Working directory: ${projectPath}`);
    }

    await executeSteps(preset, variables, { dryRun: options.dryRun });

    if (options.dryRun) {
      console.log(`
${chalk.green("✔ Done (preview only)")}
`);
    } else {
      logger.success("Project ready");
    }

    showPostRunInstructions(preset, variables);
  } catch (error) {
    if (error instanceof ForgeError) {
      console.error(chalk.red(`✖ ${error.message}`));

      if (error.step) {
        console.error(chalk.yellow("Failed step:"));
        console.error(JSON.stringify(error.step, null, 2));
      }

      if (error.cause instanceof Error) {
        console.error(chalk.gray(`Cause: ${error.cause.message}`));
      }
    } else {
      logger.error("Failed to initialize project:", error);
    }
    process.exit(1);
  }
}
