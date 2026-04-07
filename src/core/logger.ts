import chalk from "chalk";
import ora, { Ora } from "ora";

type LogLevel = "verbose" | "info" | "error" | "none";

class Logger {
  private level: LogLevel = "info";
  private spinner: Ora | null = null;
  setLevel(level: LogLevel) {
    this.level = level;
  }
  verbose(...args: any[]) {
    if (this.level === "verbose") {
      console.log(chalk.gray("[verbose]"), ...args);
    }
  }

  info(...args: any[]) {
    if (this.level !== "none") {
      console.log(chalk.blue("[info]"), ...args);
    }
  }

  warn(...args: any[]) {
    if (this.level !== "none") {
      console.warn(chalk.yellow("[warn]"), ...args);
    }
  }

  success(...args: any[]) {
    if (this.level !== "none") {
      console.log(chalk.green("✔"), ...args);
    }
  }

  error(...args: any[]) {
    if (this.level !== "none") {
      console.error(chalk.red("✖"), ...args);
    }
  }

  startSpinner(text: string): Ora {
    this.spinner = ora({ text, color: "yellow" }).start();
    return this.spinner;
  }

  stopSpinner() {
    if (this.spinner) this.spinner.stop();
  }
}
export const logger = new Logger();
