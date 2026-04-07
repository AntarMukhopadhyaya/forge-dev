import chalk from "chalk";
import { type Preset } from "../types/schema.js";
import { interpolate } from "./interpolate.js";

export function showPostRunInstructions(
  preset: Preset,
  variables: Record<string, any>,
): void {
  if (!preset.postRun || preset.postRun.length === 0) return;

  console.log(chalk.bold("\n📋 Next steps:\n"));

  preset.postRun.forEach((rawCmd, i) => {
    const cmd = interpolate(rawCmd, variables);

    const prefix = preset.postRun!.length > 1 ? `${i + 1}. ` : "";

    console.log(`  ${prefix}${chalk.cyan(cmd)}`);
  });

  console.log();
}
