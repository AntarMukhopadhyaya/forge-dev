import chalk from "chalk";
import { Step } from "../types/schema.js";

export function renderDryRunHeader() {
  console.log(`\n${chalk.bold.cyan("🔍 Dry Run Preview")}`);
}

export function renderDryRunStep(step: Step, index: number) {
  const num = `${index}.`;

  console.log(""); // consistent spacing

  if ("run" in step) {
    console.log(`${num} 🏗  Run command`);
    console.log(`   ${chalk.gray("→")} ${step.run}`);
  } else if ("cd" in step) {
    console.log(`${num} 📁 Change directory`);
    console.log(`   ${chalk.gray("→")} cd ${step.cd}`);
  } else if ("install" in step) {
    console.log(`${num} 📦 Install dependencies`);
    console.log(
      `   ${chalk.gray("→")} ${step.install.deps.join(", ")}${step.install.dev ? " (dev)" : ""}`,
    );
  } else if ("file" in step) {
    console.log(`${num} 📄 Create file`);
    console.log(`   ${chalk.gray("→")} ${step.file.path}`);
    console.log(`   ${chalk.gray("→ template:")} ${step.file.template}`);
  } else if ("env" in step) {
    console.log(`${num} 🔐 Set environment variables`);
    console.log(`   ${chalk.gray("→")} ${Object.keys(step.env).join(", ")}`);
  }
}

export function renderDryRunFooter(project: string) {
  console.log(""); // clean line break

  console.log(chalk.green("✔ Done (preview only)"));

  console.log("\n" + chalk.bold("Next steps:"));

  console.log(`  cd ${project}`);
  console.log("  npm run dev\n");
}
