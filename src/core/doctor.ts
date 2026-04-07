import fs from "fs-extra";
import { execa } from "execa";
import { ForgeError } from "./errors.js";
import { getForgeDoctorCachePath, getForgeHomeDir } from "./preset-paths.js";

export type SupportedPackageManager = "npm" | "pnpm" | "yarn";
export type SupportedFormatter = "prettier" | "black" | "gofmt" | "google-java-format";

type ToolStatus = {
  installed: boolean;
  version?: string;
};

export type ForgeDoctorProfile = {
  schemaVersion: 2;
  generatedAt: string;
  platform: NodeJS.Platform;
  nodeVersion: string;
  languages: {
    python: ToolStatus;
    go: ToolStatus;
  };
  packageManagers: {
    npm: ToolStatus;
    pnpm: ToolStatus;
    yarn: ToolStatus;
  };
  tools: {
    git: ToolStatus;
  };
  formatters: {
    prettier: ToolStatus;
    black: ToolStatus;
    gofmt: ToolStatus;
    "google-java-format": ToolStatus;
  };
  defaultPackageManager: SupportedPackageManager;
};

type MaybeProfile = Partial<ForgeDoctorProfile> & {
  languages?: Partial<ForgeDoctorProfile["languages"]>;
  packageManagers?: Partial<ForgeDoctorProfile["packageManagers"]>;
  tools?: Partial<ForgeDoctorProfile["tools"]>;
  formatters?: Partial<ForgeDoctorProfile["formatters"]>;
};

type EnsureDoctorOptions = {
  force?: boolean;
  quiet?: boolean;
};

async function detectTool(
  command: string,
  args: string[] = ["--version"],
): Promise<ToolStatus> {
  try {
    const result = await execa(command, args, { stdio: "pipe" });
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join("\n")
      .trim()
      .split(/\r?\n/)[0]
      .trim();

    return {
      installed: true,
      version: output || undefined,
    };
  } catch {
    return { installed: false };
  }
}

function normalizeStatus(
  value: unknown,
  fallback: ToolStatus = { installed: false },
): ToolStatus {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const status = value as { installed?: unknown; version?: unknown };

  return {
    installed: status.installed === true,
    version: typeof status.version === "string" ? status.version : fallback.version,
  };
}

function getDefaultProfile(): ForgeDoctorProfile {
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
    languages: {
      python: { installed: false },
      go: { installed: false },
    },
    packageManagers: {
      npm: { installed: true },
      pnpm: { installed: false },
      yarn: { installed: false },
    },
    tools: {
      git: { installed: false },
    },
    formatters: {
      prettier: { installed: false },
      black: { installed: false },
      gofmt: { installed: false },
      "google-java-format": { installed: false },
    },
    defaultPackageManager: "npm",
  };
}

function normalizeDoctorProfile(value: MaybeProfile): ForgeDoctorProfile {
  const defaults = getDefaultProfile();

  const python = normalizeStatus(value.languages?.python, defaults.languages.python);
  const go = normalizeStatus(value.languages?.go, defaults.languages.go);

  const npm = normalizeStatus(value.packageManagers?.npm, defaults.packageManagers.npm);
  const pnpm = normalizeStatus(
    value.packageManagers?.pnpm,
    defaults.packageManagers.pnpm,
  );
  const yarn = normalizeStatus(
    value.packageManagers?.yarn,
    defaults.packageManagers.yarn,
  );

  const prettier = normalizeStatus(
    value.formatters?.prettier,
    defaults.formatters.prettier,
  );
  const black = normalizeStatus(value.formatters?.black, defaults.formatters.black);
  const gofmt = normalizeStatus(value.formatters?.gofmt, {
    installed: go.installed,
    version: go.version,
  });
  const googleJavaFormat = normalizeStatus(
    value.formatters?.["google-java-format"],
    defaults.formatters["google-java-format"],
  );

  const profile: ForgeDoctorProfile = {
    schemaVersion: 2,
    generatedAt:
      typeof value.generatedAt === "string" ? value.generatedAt : defaults.generatedAt,
    platform: value.platform ?? defaults.platform,
    nodeVersion:
      typeof value.nodeVersion === "string" ? value.nodeVersion : defaults.nodeVersion,
    languages: {
      python,
      go,
    },
    packageManagers: {
      npm,
      pnpm,
      yarn,
    },
    tools: {
      git: normalizeStatus(value.tools?.git, defaults.tools.git),
    },
    formatters: {
      prettier,
      black,
      gofmt,
      "google-java-format": googleJavaFormat,
    },
    defaultPackageManager: defaults.defaultPackageManager,
  };

  profile.defaultPackageManager = inferDefaultPackageManager({
    packageManagers: profile.packageManagers,
  });

  return profile;
}

function inferDefaultPackageManager(profile: {
  packageManagers: ForgeDoctorProfile["packageManagers"];
}): SupportedPackageManager {
  const userAgent = process.env.npm_config_user_agent ?? "";

  if (userAgent.startsWith("pnpm") && profile.packageManagers.pnpm.installed) {
    return "pnpm";
  }

  if (userAgent.startsWith("yarn") && profile.packageManagers.yarn.installed) {
    return "yarn";
  }

  if (profile.packageManagers.npm.installed) {
    return "npm";
  }

  if (profile.packageManagers.pnpm.installed) {
    return "pnpm";
  }

  if (profile.packageManagers.yarn.installed) {
    return "yarn";
  }

  // npm ships with node in most environments; keep a stable fallback.
  return "npm";
}

export async function runDoctor(): Promise<ForgeDoctorProfile> {
  const [npm, pnpm, yarn, python, go, git, prettier, black, googleJavaFormat] =
    await Promise.all([
      detectTool("npm"),
      detectTool("pnpm"),
      detectTool("yarn"),
      detectTool("python"),
      detectTool("go"),
      detectTool("git"),
      detectTool("prettier"),
      detectTool("black"),
      detectTool("google-java-format"),
    ]);

  const gofmt: ToolStatus = go.installed
    ? {
        installed: true,
        version: go.version,
      }
    : {
        installed: false,
      };

  const baseProfile: Omit<ForgeDoctorProfile, "defaultPackageManager"> = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
    languages: {
      python,
      go,
    },
    packageManagers: {
      npm,
      pnpm,
      yarn,
    },
    tools: {
      git,
    },
    formatters: {
      prettier,
      black,
      gofmt,
      "google-java-format": googleJavaFormat,
    },
  };

  return {
    ...baseProfile,
    defaultPackageManager: inferDefaultPackageManager(baseProfile),
  };
}

export async function readDoctorCache(): Promise<ForgeDoctorProfile | null> {
  const cachePath = getForgeDoctorCachePath();
  if (!(await fs.pathExists(cachePath))) return null;

  try {
    const content = await fs.readFile(cachePath, "utf-8");
    return normalizeDoctorProfile(JSON.parse(content) as MaybeProfile);
  } catch {
    return null;
  }
}

export async function ensureDoctorProfile(
  options: EnsureDoctorOptions = {},
): Promise<ForgeDoctorProfile> {
  const existing = await readDoctorCache();

  if (existing && !options.force) {
    return existing;
  }

  try {
    const profile = await runDoctor();
    const homeDir = getForgeHomeDir();
    const cachePath = getForgeDoctorCachePath();

    await fs.ensureDir(homeDir);
    await fs.writeFile(cachePath, JSON.stringify(profile, null, 2), "utf-8");

    return profile;
  } catch (error) {
    if (options.quiet) {
      const fallback = existing;
      if (fallback) return fallback;

      return getDefaultProfile();
    }

    throw new ForgeError("forge doctor failed to inspect your environment", {
      cause: error as Error,
    });
  }
}

export async function resolveNodePackageManager(
  requested?: SupportedPackageManager,
): Promise<SupportedPackageManager> {
  const profile = await ensureDoctorProfile({ quiet: true });

  if (requested) {
    if (profile.packageManagers[requested].installed) {
      return requested;
    }

    throw new ForgeError(
      `Requested package manager '${requested}' is not installed. Run 'forge doctor' to refresh environment details.`,
    );
  }

  return profile.defaultPackageManager;
}
