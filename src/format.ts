import chalk from "chalk";

export function fmtUsd(n: number, decimals = 2): string {
  return "$" + n.toFixed(decimals);
}

export function fmtPct(n: number, decimals = 1): string {
  return n.toFixed(decimals) + "%";
}

export const bold   = (s: string): string => chalk.bold(s);
export const dim    = (s: string): string => chalk.gray(s);
export const green  = (s: string): string => chalk.green(s);
export const yellow = (s: string): string => chalk.yellow(s);
export const red    = (s: string): string => chalk.red(s);

export function printJson(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

export function idleScoreColored(score: number): string {
  if (score >= 60) return red(String(score));
  if (score >= 30) return yellow(String(score));
  return green(String(score));
}
