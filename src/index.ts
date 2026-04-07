#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { getAvailablePresetsWithMeta } from "./core/engine.js";
import { createPresetCommand } from "./commands/preset.js";
import chalk from "chalk";
import { ensureDoctorProfile } from "./core/doctor.js";
import { doctorCommand } from "./commands/doctor.js";
import pkg from "../package.json" with { type: "json" };

const program = new Command();

function renderHeader() {
  console.log(`
${chalk.bold.cyan("Forge")}
${chalk.gray("Scaffold modern dev stacks with focused presets.")}
`);
}

function renderPresetList() {
  const presets = getAvailablePresetsWithMeta().sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  console.log(`
${chalk.bold("Available presets")}
`);

  const nameWidth = Math.max(...presets.map((preset) => preset.name.length), 0) + 2;

  presets.forEach((preset) => {
    const name = chalk.cyan(preset.name.padEnd(nameWidth));
    const description = chalk.gray(preset.description);
    const source =
      preset.source === "custom" ? chalk.yellow("[custom]") : chalk.gray("[builtin]");
    const tags =
      preset.tags && preset.tags.length > 0
        ? chalk.magenta(`[${preset.tags.join(", ")}]`)
        : "";

    console.log(`  ${name}${source} ${description} ${tags}`.trimEnd());
  });

  console.log(`
${chalk.bold("Example")}
  ${chalk.cyan("forge-dev init next my-app")}
`);
}

// Header branding (shown in help)
program
  .name(chalk.cyan("forge-dev"))
  .description(chalk.gray("Scaffold modern dev stacks, fast and clean"))
  .version(pkg.version);

program.hook("preAction", async (_thisCommand, actionCommand) => {
  if (actionCommand.name() === "doctor") {
    return;
  }

  try {
    await ensureDoctorProfile({ quiet: true });
  } catch {
    // Doctor failures should not block scaffolding commands.
  }
});

// ================= INIT COMMAND =================
program
  .command("init <preset> [project-name]")
  .description("Create a new project from a preset")
  .option("-d, --dry-run", "Preview steps without executing")
  .option("-v, --verbose", "Show detailed logs")
  .option("-y, --yes", "Skip prompts and use defaults")
  .option("--trust", "Allow trusted remote preset sources (e.g., github.com/owner/repo)")
  .action(initCommand);

// ================= LIST COMMAND =================
program.command("list").description("Show available presets").action(renderPresetList);

program
  .command("preset")
  .description("Manage custom presets")
  .command("new <name>")
  .description("Create a new custom preset in ~/.forge/presets/custom")
  .action(createPresetCommand);

program
  .command("doctor")
  .description("Inspect local tooling and cache environment profile")
  .option("-r, --refresh", "Force refresh cached environment profile")
  .action(doctorCommand);

// ================= FALLBACK (NO COMMAND) =================
if (process.argv.length <= 2) {
  renderHeader();
  console.log(`${chalk.bold("Get started")}
  ${chalk.cyan("forge-dev init next my-app")}

${chalk.bold("Browse presets")}
  ${chalk.cyan("forge-dev list")}

${chalk.gray("Tip: use --dry-run to preview changes before writing files.")}
`);
}

await program.parseAsync();
