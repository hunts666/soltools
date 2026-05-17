import { Command } from "commander";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { depositKamino } from "@zxy-protocol/sdk";
import { resolveGlobals, parseWallet, parsePositiveNumber } from "../config";
import { bold, dim, green, yellow, printJson } from "../format";
import { loadKeypair, confirm } from "../keypair";

export function registerDepositCommand(program: Command): void {
  program
    .command("deposit <usdcAmount>")
    .description("Build a Kamino USDC deposit transaction (no lockup; ~10% APY).")
    .option("-w, --wallet <address>", "wallet public key (not required if --keypair is set)")
    .option("--keypair <path>", "sign and send with this keypair (requires confirmation)")
    .option("-y, --yes", "skip the confirmation prompt when --keypair is set")
    .action(async (amountArg: string, opts: Record<string, string>, cmd: Command) => {
      const { rpcUrl, json } = resolveGlobals(cmd);
      const usdc = parsePositiveNumber(amountArg, "usdcAmount");

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
      const result     = await depositKamino(connection, walletPubkey, usdc);

      const txBase64 = result.transaction
        .serialize({ requireAllSignatures: false, verifySignatures: false })
        .toString("base64");

      if (json) {
        printJson({
          wallet:         walletPubkey.toBase58(),
          amountUsdc:     usdc,
          expectedShares: result.expectedShares,
          instructions:   result.transaction.instructions.length,
          txBase64,
        });
      } else {
        console.log();
        console.log(bold("Built Kamino USDC deposit"));
        console.log("Wallet:        " + walletPubkey.toBase58());
        console.log("Amount:        " + usdc + " USDC");
        console.log(
          "Shares (~):    " +
            result.expectedShares +
            " " +
            dim("(SDK reports input amount; actual kUSDC depends on reserve rate)")
        );
        console.log("Instructions:  " + result.transaction.instructions.length);
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
            "Deposit " +
              usdc +
              " USDC to Kamino from " +
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
