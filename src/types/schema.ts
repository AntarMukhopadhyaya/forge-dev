import { z } from "zod";

const RunStep = z.object({
  run: z.string(),
});
const CdStep = z.object({
  cd: z.string(),
});
const InstallStep = z.object({
  install: z.object({
    deps: z.array(z.string()),
    dev: z.boolean().optional(),
  }),
});
const FileStep = z.object({
  file: z.object({
    path: z.string(),
    template: z.string(),
    vars: z.record(z.string(), z.any()).optional(),
  }),
});
const EnvStep = z.object({
  env: z.record(z.string(), z.string()),
});
// Conditional step (if field)
const IfCondition = z.record(z.string(), z.any()); // e.g., { database: "postgres" }

export const Step = z.union([
  RunStep.extend({ if: IfCondition.optional() }),
  CdStep.extend({ if: IfCondition.optional() }),
  InstallStep.extend({ if: IfCondition.optional() }),
  FileStep.extend({ if: IfCondition.optional() }),
  EnvStep.extend({ if: IfCondition.optional() }),
]);

export type Step = z.infer<typeof Step>;

// Variable definition (simple version)
const VariableChoice = z.object({
  type: z.literal("choice"),
  options: z.array(z.string()),
  default: z.string().optional(),
  prompt: z.string(),
});

const VariableString = z.object({
  type: z.literal("string"),
  default: z.string().optional(),
  prompt: z.string().optional(),
});

const Variable = z.discriminatedUnion("type", [VariableChoice, VariableString]);

export const PresetSchema = z.object({
  name: z.string(),
  aliases: z.array(z.string().min(1)).optional(),
  description: z.string().optional(),
  version: z.string().optional(),
  runtime: z.enum(["node", "python", "go"]),
  packageManager: z.enum(["npm", "pnpm", "yarn"]).optional(),
  variables: z.record(z.string(), Variable).optional(),
  steps: z.array(Step),
  postRun: z.array(z.string()).optional(), // e.g., ["npm install", "npm run dev"]
});

export type Preset = z.infer<typeof PresetSchema>;

export type LoadedPreset = Preset & {
  sourcePath?: string;
};
