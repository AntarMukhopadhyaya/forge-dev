import chalk from "chalk";
import { ensureDoctorProfile } from "../core/doctor.js";
import { ForgeError } from "../core/errors.js";

export async function doctorCommand(options: { refresh?: boolean } = {}) {
  try {
    const profile = await ensureDoctorProfile({ force: options.refresh });

    const status = (installed: boolean) =>
      installed ? chalk.green("installed") : chalk.red("missing");

    console.log(chalk.bold("\nForge Doctor\n"));
    console.log(`Platform: ${profile.platform}`);
    console.log(`Node.js: ${profile.nodeVersion}`);
    console.log(`Default package manager: ${profile.defaultPackageManager}`);

    console.log(chalk.bold("\nPackage managers"));
    console.log(
      `  npm: ${status(profile.packageManagers.npm.installed)} ${profile.packageManagers.npm.version ?? ""}`,
    );
    console.log(
      `  pnpm: ${status(profile.packageManagers.pnpm.installed)} ${profile.packageManagers.pnpm.version ?? ""}`,
    );
    console.log(
      `  yarn: ${status(profile.packageManagers.yarn.installed)} ${profile.packageManagers.yarn.version ?? ""}`,
    );

    console.log(chalk.bold("\nLanguages"));
    console.log(
      `  python: ${status(profile.languages.python.installed)} ${profile.languages.python.version ?? ""}`,
    );
    console.log(
      `  go: ${status(profile.languages.go.installed)} ${profile.languages.go.version ?? ""}`,
    );

    console.log(chalk.bold("\nTools"));
    console.log(
      `  git: ${status(profile.tools.git.installed)} ${profile.tools.git.version ?? ""}`,
    );

    console.log(chalk.bold("\nFormatters"));
    console.log(
      `  prettier: ${status(profile.formatters.prettier.installed)} ${profile.formatters.prettier.version ?? ""}`,
    );
    console.log(
      `  black: ${status(profile.formatters.black.installed)} ${profile.formatters.black.version ?? ""}`,
    );
    console.log(
      `  gofmt: ${status(profile.formatters.gofmt.installed)} ${profile.formatters.gofmt.version ?? ""}`,
    );
    console.log(
      `  google-java-format: ${status(profile.formatters["google-java-format"].installed)} ${profile.formatters["google-java-format"].version ?? ""}`,
    );

    console.log(chalk.gray(`\nUpdated: ${profile.generatedAt}\n`));
  } catch (error) {
    if (error instanceof ForgeError) {
      console.error(chalk.red(`✖ ${error.message}`));
      if (error.cause instanceof Error) {
        console.error(chalk.gray(`Cause: ${error.cause.message}`));
      }
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`✖ forge-dev doctor failed: ${message}`));
    }
    process.exit(1);
  }
}
