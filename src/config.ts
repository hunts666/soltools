import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";

export interface GlobalOptions {
  rpcUrl: string;
  json:   boolean;
}

export function resolveGlobals(cmd: Command): GlobalOptions {
  const opts   = cmd.optsWithGlobals();
  const rpcUrl =
    (opts.rpcUrl as string | undefined) ??
    process.env.HELIUS_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    "";

  if (!rpcUrl) {
    throw new Error(
      "no RPC URL configured. Pass --rpc-url <url>, or export " +
        "HELIUS_RPC_URL / SOLANA_RPC_URL. The public mainnet endpoint " +
        "rate-limits the methods this tool uses."
    );
  }

  return { rpcUrl, json: Boolean(opts.json) };
}

export function parseWallet(addr: string): PublicKey {
  try {
    return new PublicKey(addr);
  } catch {
    throw new Error(`invalid Solana address: ${addr}`);
  }
}

export function parsePositiveNumber(input: string, label: string): number {
  const n = parseFloat(input);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${label} must be a positive number (got "${input}")`);
  }
  return n;
}
