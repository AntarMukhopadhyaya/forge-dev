import path from "path";
import { execa } from "execa";
import { ensureDoctorProfile } from "./doctor.js";
import { logger } from "./logger.js";

type FormatterName = "prettier" | "black" | "gofmt" | "google-java-format";

const warnedMissing = new Set<FormatterName>();
const warnedFailed = new Set<FormatterName>();

export function getFormatterForFile(filePath: string): FormatterName | null {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return "prettier";
    case ".py":
      return "black";
    case ".go":
      return "gofmt";
    case ".java":
      return "google-java-format";
    default:
      return null;
  }
}

async function runFormatter(formatter: FormatterName, filePath: string): Promise<void> {
  if (formatter === "prettier") {
    await execa("prettier", ["--write", filePath], { stdio: "pipe" });
    return;
  }

  if (formatter === "black") {
    await execa("black", [filePath], { stdio: "pipe" });
    return;
  }

  if (formatter === "gofmt") {
    await execa("gofmt", ["-w", filePath], { stdio: "pipe" });
    return;
  }

  await execa("google-java-format", ["--replace", filePath], { stdio: "pipe" });
}

export async function formatGeneratedFile(filePath: string): Promise<void> {
  const formatter = getFormatterForFile(filePath);
  if (!formatter) return;

  const profile = await ensureDoctorProfile({ quiet: true });
  const installed = profile.formatters[formatter]?.installed === true;

  if (!installed) {
    if (!warnedMissing.has(formatter)) {
      warnedMissing.add(formatter);
      logger.warn(
        `${formatter} not found in environment, skipping formatting for ${filePath}`,
      );
    }
    return;
  }

  try {
    await runFormatter(formatter, filePath);
    logger.verbose(`Formatted ${filePath} with ${formatter}`);
  } catch (error) {
    if (!warnedFailed.has(formatter)) {
      warnedFailed.add(formatter);
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `${formatter} failed for ${filePath}, skipping formatting (${message})`,
      );
    }
  }
}
