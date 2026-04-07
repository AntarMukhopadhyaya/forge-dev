import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

export function getForgeHomeDir(): string {
  const override = process.env.FORGE_HOME?.trim();
  if (override) return path.resolve(override);

  return path.join(os.homedir(), ".forge");
}

export function getForgePresetsDir(): string {
  return path.join(getForgeHomeDir(), "presets");
}

export function getForgeCustomPresetDir(): string {
  return path.join(getForgePresetsDir(), "custom");
}

export function getForgeDoctorCachePath(): string {
  return path.join(getForgeHomeDir(), "doctor.json");
}

export function getWorkspaceCustomPresetDirs(cwd: string = process.cwd()): string[] {
  return [path.join(cwd, "presets"), path.join(cwd, "presets", "custom")];
}

export function getCustomPresetDirs(cwd: string = process.cwd()): string[] {
  return [...getWorkspaceCustomPresetDirs(cwd), getForgeCustomPresetDir()];
}

export function findYamlFilesRecursive(directory: string, maxDepth = 4): string[] {
  if (!fs.existsSync(directory)) return [];

  const files: string[] = [];

  const walk = (current: string, depth: number) => {
    if (depth > maxDepth) return;

    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const next = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(next, depth + 1);
        continue;
      }

      if (
        entry.isFile() &&
        (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))
      ) {
        files.push(next);
      }
    }
  };

  walk(directory, 0);

  return files;
}
