import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as readline from "readline";

export function loadKeypair(filePath: string): Keypair {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    throw new Error(`failed to read keypair file ${filePath}: ${(e as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`keypair file ${filePath} is not valid JSON`);
  }

  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error(
      `keypair file ${filePath} must be a JSON array of 64 bytes ` +
        "(the solana-keygen export format)"
    );
  }

  return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
}

export async function confirm(prompt: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    throw new Error(
      "stdin is not a TTY — confirmation prompt cannot be answered. " +
        "Re-run with --yes to skip the prompt."
    );
  }
  const rl = readline.createInterface({
    input:  process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
