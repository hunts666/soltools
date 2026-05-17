import { Command } from "commander";
import {
  fetchLiveApys,
  fetchSolPrice,
  fetchJitoApy,
  fetchKaminoApy,
  fetchMarginFiApy,
} from "@zxy-protocol/sdk";
import { fmtPct, fmtUsd, bold, dim, yellow, printJson } from "../format";

interface Probe<T> {
  value: T | null;
  error: string | null;
}

async function probe<T>(p: Promise<T>): Promise<Probe<T>> {
  try {
    return { value: await p, error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export function registerApysCommand(program: Command): void {
  program
    .command("apys")
    .description("Print live SOL price and current protocol APYs")
    .option("-v, --verbose", "show each upstream API call individually with its error")
    .action(async (opts: { verbose?: boolean }, cmd: Command) => {
      const json    = Boolean(cmd.optsWithGlobals().json);
      const verbose = Boolean(opts.verbose);

      if (verbose || json) {
        // Probe each API separately so failures are visible per-source.
        const [solPrice, jito, kamino, marginfi] = await Promise.all([
          probe(fetchSolPrice()),
          probe(fetchJitoApy()),
          probe(fetchKaminoApy()),
          probe(fetchMarginFiApy()),
        ]);

        if (json) {
          printJson({ solPrice, jito, kamino, marginfi });
          return;
        }

        console.log();
        console.log(bold("Live market data (verbose)"));
        printLine("SOL/USD",  solPrice.value !== null ? fmtUsd(solPrice.value) : null, solPrice.error);
        printLine("jitoSOL",  jito.value     !== null ? fmtPct(jito.value)     : null, jito.error,     "(SOL staking)");
        printLine("Kamino",   kamino.value   !== null ? fmtPct(kamino.value)   : null, kamino.error,   "(USDC supply)");
        printLine("MarginFi", marginfi.value !== null ? fmtPct(marginfi.value) : null, marginfi.error, "(USDC supply)");
        return;
      }

      // Default path: fast and quiet. fetchLiveApys() falls back internally.
      const solProbe = await probe(fetchSolPrice());
      const apys     = await fetchLiveApys();

      console.log();
      console.log(bold("Live market data"));
      if (solProbe.value !== null) {
        console.log("SOL/USD:    " + fmtUsd(solProbe.value));
      } else {
        console.log("SOL/USD:    " + dim("(unavailable)"));
        console.log(yellow("            " + (solProbe.error ?? "unknown error")));
        console.log(dim("            re-run with `soltools apys --verbose` to see all API errors"));
      }
      console.log("jitoSOL:    " + fmtPct(apys.jitoSOL) + " " + dim("(SOL staking)"));
      console.log("Kamino:     " + fmtPct(apys.kamino) + " " + dim("(USDC supply)"));
      console.log("MarginFi:   " + fmtPct(apys.marginfi) + " " + dim("(USDC supply)"));
      console.log();
      console.log(dim("Fetched at " + new Date(apys.fetchedAt).toISOString()));
    });
}

function printLine(label: string, value: string | null, error: string | null, suffix = ""): void {
  const pad = (label + ":").padEnd(12);
  if (value !== null) {
    console.log(pad + value + (suffix ? "  " + dim(suffix) : ""));
  } else {
    console.log(pad + dim("(failed)") + (suffix ? "  " + dim(suffix) : ""));
    console.log(yellow("            " + (error ?? "unknown error")));
  }
}

