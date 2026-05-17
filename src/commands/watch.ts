import { Command } from "commander";
import {
  runMonitorCycle,
  DEFAULT_THRESHOLD,
  type MonitoredWallet,
} from "@zxy-protocol/sdk";
import { resolveGlobals, parseWallet, parsePositiveNumber } from "../config";
import {
  bold,
  dim,
  green,
  yellow,
  fmtUsd,
  fmtPct,
  printJson,
} from "../format";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const STATE_DIR  = path.join(os.homedir(), ".soltools");
const STATE_FILE = path.join(STATE_DIR, "watch.json");

export function registerWatchCommand(program: Command): void {
  program
    .command("watch <wallet>")
    .description(
      "Detect rebalance opportunities. Runs once by default; pass --interval to loop. " +
        "State (pending opportunities) is persisted to ~/.soltools/watch.json."
    )
    .option(
      "-t, --threshold <pct>",
      "minimum APY gain to report (percent)",
      String(DEFAULT_THRESHOLD)
    )
    .option(
      "-i, --interval <seconds>",
      "loop every N seconds (default: run once and exit)"
    )
    .option("--reset", "clear stored opportunities for this wallet before running")
    .action(async (wallet: string, opts: Record<string, string>, cmd: Command) => {
      const { rpcUrl, json } = resolveGlobals(cmd);
      parseWallet(wallet);

      const threshold = parsePositiveNumber(opts.threshold ?? String(DEFAULT_THRESHOLD), "threshold");
      const interval  = opts.interval !== undefined
        ? parsePositiveNumber(opts.interval, "interval")
        : null;

      let state = loadState(wallet, threshold);
      state.threshold = threshold;
      if (opts.reset) state.opportunities = [];

      const runOnce = async (): Promise<void> => {
        state = await runMonitorCycle(state, { rpcUrl });
        saveState(state);
        renderCycle(state, json);
      };

      await runOnce();
      if (interval === null) return;

      if (!json) {
        console.log();
        console.log(dim("Looping every " + interval + "s. Press Ctrl-C to stop."));
      }

      setInterval(() => {
        runOnce().catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(yellow("Cycle error: " + msg));
        });
      }, interval * 1000);

      // Keep the process alive until interrupted.
      await new Promise<void>(() => { /* never */ });
    });
}

function loadState(address: string, threshold: number): MonitoredWallet {
  try {
    const all = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as Record<string, MonitoredWallet>;
    if (all[address]) return all[address];
  } catch {
    // No state file yet — fall through.
  }
  return {
    address,
    registeredAt:  Date.now(),
    lastChecked:   0,
    threshold,
    opportunities: [],
    positions:     [],
  };
}

function saveState(state: MonitoredWallet): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  let all: Record<string, MonitoredWallet> = {};
  try {
    all = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as Record<string, MonitoredWallet>;
  } catch {
    // empty
  }
  all[state.address] = state;
  fs.writeFileSync(STATE_FILE, JSON.stringify(all, null, 2));
}

function renderCycle(state: MonitoredWallet, json: boolean): void {
  if (json) {
    printJson(state);
    return;
  }

  console.log();
  console.log(bold("[" + new Date().toISOString() + "] " + state.address));
  console.log(
    dim("threshold " + fmtPct(state.threshold) + "  |  state " + STATE_FILE)
  );

  console.log();
  console.log(bold("Positions"));
  if (state.positions.length === 0) {
    console.log(dim("  (none detected)"));
  } else {
    for (const p of state.positions) {
      console.log(
        "  " +
          p.asset.padEnd(5) +
          p.currentVenue.padEnd(10) +
          fmtPct(p.currentApy).padStart(6) +
          "  " +
          fmtUsd(p.usdValue)
      );
    }
  }

  const pending = state.opportunities.filter((o) => o.status === "pending");

  console.log();
  console.log(
    bold(
      "Opportunities (" +
        pending.length +
        " pending, " +
        state.opportunities.length +
        " total)"
    )
  );
  if (pending.length === 0) {
    console.log(dim("  (none above threshold)"));
    return;
  }
  for (const o of pending) {
    console.log(
      "  " +
        green(o.asset.padEnd(5)) +
        o.fromVenue.padEnd(10) +
        " -> " +
        o.toVenue.padEnd(10) +
        "+" +
        fmtPct(o.apyGain).padStart(5) +
        "  +" +
        fmtUsd(o.estimatedExtraYearlyUsd) +
        "/yr"
    );
  }
}
