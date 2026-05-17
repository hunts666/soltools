import { Command } from "commander";
import { scanWallet } from "@zxy-protocol/sdk";
import { resolveGlobals, parseWallet } from "../config";
import {
  fmtUsd,
  fmtPct,
  bold,
  dim,
  yellow,
  printJson,
  idleScoreColored,
} from "../format";

export function registerScanCommand(program: Command): void {
  program
    .command("scan <wallet>")
    .description("Scan a Solana wallet for idle balances and missed yield")
    .action(async (wallet: string, _opts: unknown, cmd: Command) => {
      const { rpcUrl, json } = resolveGlobals(cmd);
      parseWallet(wallet);

      const result = await scanWallet(wallet, { rpcUrl });

      if (json) {
        printJson(result);
        return;
      }

      console.log();
      console.log(bold("Wallet ") + wallet);
      console.log(dim("RPC:    " + rpcUrl));
      console.log();
      console.log("Total value:    " + fmtUsd(result.totalUsdValue));
      console.log("Idle score:     " + idleScoreColored(result.idleScore) + "/100");
      console.log("Missed/day:     " + fmtUsd(result.totalMissedDailyUsd, 4));
      console.log("Missed/year:    " + fmtUsd(result.totalMissedYearlyUsd));
      console.log();
      console.log(
        "SOL balance:    " +
          result.solBalance.toFixed(4) +
          " SOL  (" +
          fmtUsd(result.solUsdValue) +
          ")"
      );
      console.log("SOL current:    " + fmtPct(result.solCurrentApy) + " APY");
      console.log(
        "SOL best:       " +
          fmtPct(result.solBestApy) +
          " APY via " +
          result.solVenue
      );

      if (result.tokens.length === 0) {
        console.log();
        console.log(dim("(no known tokens detected)"));
        return;
      }

      console.log();
      console.log(bold("Tokens"));
      for (const t of result.tokens) {
        const marker = t.isIdle ? "  " + yellow("[IDLE]") : "";
        console.log(
          "  " +
            t.symbol.padEnd(8) +
            t.balance.toFixed(2).padStart(12) +
            "  " +
            fmtUsd(t.usdValue).padStart(10) +
            "  current " +
            fmtPct(t.currentApy).padStart(5) +
            "  best " +
            fmtPct(t.bestApy).padStart(5) +
            "  via " +
            t.venue +
            marker
        );
      }
    });
}
