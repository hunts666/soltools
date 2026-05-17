import { Command } from "commander";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  stakeJito,
  stakePhantom,
  stakeHelius,
  type SolStakeResult,
} from "@zxy-protocol/sdk";
import { resolveGlobals, parseWallet, parsePositiveNumber } from "../config";
import { bold, dim, green, yellow, printJson } from "../format";
import { loadKeypair, confirm } from "../keypair";

type Builder = (
  connection: Connection,
  wallet:     PublicKey,
  solAmount:  number
) => Promise<SolStakeResult>;

const BUILDERS: Record<string, Builder> = {
  jito:    stakeJito,
  phantom: stakePhantom,
  helius:  stakeHelius,
};

export function registerStakeCommand(program: Command): void {
  program
    .command("stake <amount>")
    .description(
      "Build a SOL liquid-staking transaction (Jito, Phantom, or Helius)."
    )
    .option("-w, --wallet <address>", "wallet public key (not required if --keypair is set)")
    .option("-v, --venue <name>", "stake pool: jito | phantom | helius", "helius")
    .option("--keypair <path>", "sign and send with this keypair (requires confirmation)")
    .option("-y, --yes", "skip the confirmation prompt when --keypair is set")
    .action(async (amountArg: string, opts: Record<string, string>, cmd: Command) => {
      const { rpcUrl, json } = resolveGlobals(cmd);
      const sol = parsePositiveNumber(amountArg, "amount");

      const venue = (opts.venue ?? "helius").toLowerCase();
      const builder = BUILDERS[venue];
      if (!builder) {
        throw new Error(
          `unknown venue "${opts.venue}". Must be one of: ${Object.keys(BUILDERS).join(", ")}`
        );
      }

      let signer:       Keypair | null = null;
      let walletPubkey: PublicKey;
      if (opts.keypair) {
        signer       = loadKeypair(opts.keypair);
        walletPubkey = signer.publicKey;
      } else if (opts.wallet) {
        walletPubkey = parseWallet(opts.wallet);
      } else {
        throw new Error("either --wallet <address> or --keypair <path> is required");
      }

      const connection = new Connection(rpcUrl, "confirmed");
      const result     = await builder(connection, walletPubkey, sol);

      const txBase64 = result.transaction
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");

      if (json) {
        printJson({
          venue,
          wallet:       walletPubkey.toBase58(),
          amountSol:    sol,
          outputToken:  result.outputToken,
          expectedOut:  result.expectedOut,
          signers:      result.signers.length,
          instructions: result.transaction.instructions.length,
          txBase64,
        });
      } else {
        console.log();
        console.log(bold("Built " + venue + " stake transaction"));
        console.log("Wallet:        " + walletPubkey.toBase58());
        console.log("Amount:        " + sol + " SOL");
        console.log(
          "Output (~):    " +
            result.expectedOut.toFixed(4) +
            " " +
            result.outputToken +
            " " +
            dim("(slippage estimate, not pool exchange rate)")
        );
        console.log("Instructions:  " + result.transaction.instructions.length);
        console.log("Signers:       " + result.signers.length + " ephemeral");
      }

      if (!signer) {
        if (!json) {
          console.log();
          console.log(dim("Transaction (base64, unsigned):"));
          console.log(txBase64);
          console.log();
          console.log(dim("Pass --keypair <path> to sign and send."));
        }
        return;
      }

      if (!opts.yes) {
        const ok = await confirm(
          yellow(
            "Send " +
              sol +
              " SOL to the " +
              venue +
              " stake pool from " +
              signer.publicKey.toBase58() +
              "? [y/N] "
          )
        );
        if (!ok) {
          console.log("Aborted.");
          return;
        }
      }

      const sig = await sendAndConfirmTransaction(
        connection,
        result.transaction,
        [signer, ...result.signers]
      );

      if (json) {
        printJson({ signature: sig, solscan: "https://solscan.io/tx/" + sig });
      } else {
        console.log();
        console.log(green("Sent: " + sig));
        console.log(dim("https://solscan.io/tx/" + sig));
      }
    });
}
