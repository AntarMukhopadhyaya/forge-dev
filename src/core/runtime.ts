import { LoadedPreset, Step } from "../types/schema.js";
import { execa } from "execa";
import { logger } from "./logger.js";
import { ForgeError } from "./errors.js";
import path from "path";
import { outputFile } from "fs-extra";
import { renderTemplate } from "./template.js";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { resolveNodePackageManager, type SupportedPackageManager } from "./doctor.js";
import { formatGeneratedFile } from "./formatters.js";
export async function executeStep(
  step: Step,
  preset: LoadedPreset,
  variables: Record<string, any>,
): Promise<void> {
  if ("run" in step) {
    const command = await resolveRunCommand(step.run, preset);
    await execa(command, { shell: true, stdio: "inherit" });
  } else if ("cd" in step) {
    process.chdir(step.cd);
    logger.verbose(`Changed directory to ${step.cd}`);
  } else if ("install" in step) {
    const { deps = [], dev = false } = step.install;
    await installPackages(deps, preset, dev, step.install.command);
  } else if ("file" in step) {
    const { path: filePath, template: templateName, vars = {} } = step.file;
    await generateFileFromTemplate(filePath, templateName, preset.sourcePath, {
      ...variables,
      ...vars,
    });
  } else if ("env" in step) {
    await writeEnvFile(step.env);
  } else {
    throw new ForgeError(`Unknown step type: ${JSON.stringify(step)}`, {
      step,
    });
  }
}
async function installPackages(
  packages: string[],
  preset: LoadedPreset,
  dev: boolean,
  customInstallCommand?: string,
): Promise<void> {
  if (packages.length === 0) return;
  const { runtime } = preset;
  let command: string;
  let args: string[];

  if (customInstallCommand) {
    const commandLine = [customInstallCommand, ...packages].join(" ").trim();
    logger.info(`Installing packages: ${packages.join(", ")}...`);
    await execa(commandLine, { shell: true, stdio: "inherit" });
    return;
  }

  switch (runtime) {
    case "node": {
      const packageManager = toSupportedPackageManager(preset.packageManager);

      if (!packageManager) {
        throw new ForgeError(`Unsupported package manager: ${preset.packageManager}`, {
          step: {
            install: { deps: packages, dev },
          },
        });
      }

      const resolvedPackageManager = await resolveNodePackageManager(packageManager);

      if (resolvedPackageManager === "npm") {
        command = "npm";
        args = [
          "install",
          ...(dev ? ["--save-dev", "--include=dev"] : ["--save"]),
          ...packages,
        ];
      } else if (resolvedPackageManager === "pnpm") {
        command = "pnpm";
        args = ["add", ...(dev ? ["-D"] : []), ...packages];
      } else if (resolvedPackageManager === "yarn") {
        command = "yarn";
        args = ["add", ...(dev ? ["-D"] : []), ...packages];
      } else {
        throw new ForgeError(`Unsupported package manager: ${resolvedPackageManager}`, {
          step: {
            install: { deps: packages, dev },
          },
        });
      }
      break;
    }
    case "python":
      command = "pip";
      args = ["install", ...(dev ? ["--dev"] : []), ...packages];
      break;
    case "go":
      command = "go";
      args = ["get", ...packages];
      break;
    default:
      throw new ForgeError(`Unsupported runtime: ${runtime}`, {
        step: {
          install: { deps: packages, dev },
        },
      });
  }
  logger.info(`Installing packages: ${packages.join(", ")}...`);
  await execa(command, args, { stdio: "inherit" });
}

async function resolveRunCommand(command: string, preset: LoadedPreset): Promise<string> {
  if (preset.runtime !== "node") return command;

  const packageManager = toSupportedPackageManager(preset.packageManager);
  if (!packageManager) return command;

  const resolvedPackageManager = await resolveNodePackageManager(packageManager);
  return rewriteNodeRunCommand(command, resolvedPackageManager);
}

function toSupportedPackageManager(
  value: string | undefined,
): SupportedPackageManager | undefined {
  if (value === "npm" || value === "pnpm" || value === "yarn") {
    return value;
  }

  return undefined;
}

function rewriteNpmRunWithPrefix(
  command: string,
  packageManager: SupportedPackageManager,
): string {
  return command.replace(
    /\bnpm\s+run\s+([^\s"']+)\s+--prefix\s+([^\s"']+)/g,
    (_fullMatch, script: string, cwd: string) => {
      if (packageManager === "npm") {
        return `npm --prefix ${cwd} run ${script}`;
      }

      if (packageManager === "pnpm") {
        return `pnpm -C ${cwd} run ${script}`;
      }

      return `yarn --cwd ${cwd} run ${script}`;
    },
  );
}

function rewriteNpmInstallCommand(
  command: string,
  packageManager: SupportedPackageManager,
): string {
  return command.replace(
    /\bnpm\s+install\b([^\n;&|]*?)(?=\s*(?:&&|\|\||;|$))/g,
    (_fullMatch, argsRaw: string) => {
      const args = argsRaw.trim().split(/\s+/).filter(Boolean);

      if (args.length === 0) {
        return packageManager === "pnpm" ? "pnpm install" : "yarn install";
      }

      const isDev = args.some((arg) => arg === "-D" || arg === "--save-dev");
      const filtered = args.filter(
        (arg) =>
          arg !== "-D" &&
          arg !== "--save-dev" &&
          arg !== "--save" &&
          arg !== "-S" &&
          arg !== "--include=dev",
      );

      const hasPackages = filtered.some((arg) => !arg.startsWith("-"));

      if (!hasPackages) {
        const base = packageManager === "pnpm" ? "pnpm install" : "yarn install";
        return [base, ...filtered].join(" ").trim();
      }

      const base = packageManager === "pnpm" ? "pnpm add" : "yarn add";
      const nextArgs = [...filtered];

      if (isDev) {
        nextArgs.unshift("-D");
      }

      return [base, ...nextArgs].join(" ").trim();
    },
  );
}

export function rewriteNodeRunCommand(
  command: string,
  packageManager: SupportedPackageManager,
): string {
  if (packageManager === "npm") {
    return command;
  }

  let rewritten = command;

  rewritten = rewriteNpmRunWithPrefix(rewritten, packageManager);
  rewritten = rewriteNpmInstallCommand(rewritten, packageManager);

  rewritten = rewritten.replace(/\bnpm\s+create\b/g, `${packageManager} create`);
  rewritten = rewritten.replace(
    /\bnpx\b/g,
    packageManager === "pnpm" ? "pnpm dlx" : "yarn dlx",
  );
  rewritten = rewritten.replace(
    /\bnpm\s+run\b/g,
    packageManager === "pnpm" ? "pnpm run" : "yarn run",
  );
  rewritten = rewritten.replace(
    /\bnpm\s+test\b/g,
    packageManager === "pnpm" ? "pnpm test" : "yarn test",
  );

  return rewritten;
}

async function generateFileFromTemplate(
  filePath: string,
  templateName: string,
  presetSourcePath: string | undefined,
  variables: Record<string, any>,
): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const localCandidates = resolveLocalTemplateCandidates(templateName, presetSourcePath);

  const candidates = [
    ...localCandidates,
    path.join(__dirname, "..", "templates", templateName),
    path.join(__dirname, "..", "..", "src", "templates", templateName),
    path.join(process.cwd(), "src", "templates", templateName),
    path.join(process.cwd(), "dist", "templates", templateName),
  ];

  const templatePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!templatePath) {
    throw new ForgeError(`Template not found: ${templateName}`);
  }

  const content = await renderTemplate(templatePath, variables);
  await outputFile(filePath, content);
  await formatGeneratedFile(filePath);
  logger.info(`Generated file: ${filePath}`);
}

function resolveLocalTemplateCandidates(
  templateName: string,
  presetSourcePath: string | undefined,
): string[] {
  if (!presetSourcePath) return [];

  const presetDir = path.dirname(presetSourcePath);

  if (path.isAbsolute(templateName)) {
    return [templateName];
  }

  if (
    templateName.startsWith(".") ||
    templateName.includes("/") ||
    templateName.includes("\\")
  ) {
    return [path.resolve(presetDir, templateName)];
  }

  return [];
}
async function writeEnvFile(envVars: Record<string, string>): Promise<void> {
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  await outputFile(".env", envContent);
  logger.info(`Generated .env file`);
}
