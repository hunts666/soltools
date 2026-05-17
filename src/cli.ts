#!/usr/bin/env node
import { Command } from "commander";
import { registerScanCommand } from "./commands/scan";
import { registerApysCommand } from "./commands/apys";
import { registerStakeCommand } from "./commands/stake";
import { registerDepositCommand } from "./commands/deposit";
import { registerWatchCommand } from "./commands/watch";

const program = new Command();

program
  .name("soltools")
  .description(
    "Solana yield CLI — scan wallets, build staking/lending transactions, " +
      "and watch for rebalance opportunities. Built on the ZXY Protocol SDK."
  )
  .version("0.1.0")
  .option(
    "--rpc-url <url>",
    "Solana JSON-RPC endpoint. Overrides $HELIUS_RPC_URL / $SOLANA_RPC_URL."
  )
  .option("--json", "Emit JSON instead of human-readable output");

registerScanCommand(program);
registerApysCommand(program);
registerStakeCommand(program);
registerDepositCommand(program);
registerWatchCommand(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("\nsoltools: " + msg);
  process.exitCode = 1;
});
