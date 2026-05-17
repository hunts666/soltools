import { Command } from "commander";
import { fetchLiveApys, fetchSolPrice } from "@zxy-protocol/sdk";
import { fmtPct, fmtUsd, bold, dim, printJson } from "../format";

export function registerApysCommand(program: Command): void {
  program
    .command("apys")
    .description("Print live SOL price and current protocol APYs")
    .action(async (_opts: unknown, cmd: Command) => {
      const json = Boolean(cmd.optsWithGlobals().json);

      const [apys, solPrice] = await Promise.all([
        fetchLiveApys(),
        fetchSolPrice().catch(() => null),
      ]);

      if (json) {
        printJson({ solPrice, apys });
        return;
      }

      console.log();
      console.log(bold("Live market data"));
      console.log(
        "SOL/USD:    " +
          (solPrice !== null ? fmtUsd(solPrice) : dim("(unavailable, using fallback)"))
      );
      console.log("jitoSOL:    " + fmtPct(apys.jitoSOL) + " " + dim("(SOL staking)"));
      console.log("Kamino:     " + fmtPct(apys.kamino) + " " + dim("(USDC supply)"));
      console.log("MarginFi:   " + fmtPct(apys.marginfi) + " " + dim("(USDC supply)"));
      console.log();
      console.log(dim("Fetched at " + new Date(apys.fetchedAt).toISOString()));
    });
}
