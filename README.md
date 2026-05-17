# soltools

A command-line tool for working with Solana yield. Scan any wallet for idle
balances, build liquid-staking / lending transactions, and watch for
rebalance opportunities — all from your terminal.

Built on the [ZXY Protocol SDK](https://github.com/ZXY-PROTOCOL/ZXY-Protocol-SDK).
soltools is a thin CLI layer; all on-chain logic lives in the SDK.

---

## Install

soltools is not yet on npm. Clone both repos as siblings and build the SDK
first, since soltools depends on it via `file:../ZXY-Protocol-SDK`:

```bash
git clone https://github.com/hunts666/ZXY-Protocol-SDK.git
cd ZXY-Protocol-SDK && npm install && npm run build && cd ..

git clone https://github.com/hunts666/soltools.git
cd soltools
npm install
npm run build           # compiles to dist/
npm link                # optional: makes `soltools` available globally
```

The two directories must sit side by side. soltools resolves
`@zxy-protocol/sdk` to `../ZXY-Protocol-SDK/dist/` via the file: protocol.

> The SDK is a fork of [`ZXY-PROTOCOL/ZXY-Protocol-SDK`](https://github.com/ZXY-PROTOCOL/ZXY-Protocol-SDK)
> with TypeScript build fixes applied so `npm run build` succeeds under
> strict mode. Use the fork above; the upstream repo will not build without
> patches.

### Configure

```bash
cp .env.example .env
# Edit .env and set HELIUS_RPC_URL to your endpoint
```

The public `api.mainnet-beta.solana.com` rate-limits
`getTokenAccountsByOwner`, which `scan` and `watch` rely on. Use Helius,
Triton, QuickNode, or self-hosted.

---

## Commands

### `soltools scan <wallet>`

Scan a wallet for idle balances and missed yield.

```bash
soltools scan 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU

# Wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
# RPC:    https://mainnet.helius-rpc.com/?api-key=…
#
# Total value:    $1240.50
# Idle score:     65/100
# Missed/day:     $0.2342
# Missed/year:    $85.50
#
# SOL balance:    5.4200 SOL  ($812.00)
# SOL current:    0.0% APY
# SOL best:       7.8% APY via Jito
#
# Tokens
#   USDC          428.50      $428.50  current  0.0%  best 10.4%  via Kamino  [IDLE]
```

Pass `--json` for machine-readable output.

### `soltools apys`

Print live SOL price and current protocol APYs (no wallet required).

```bash
soltools apys
```

### `soltools stake <amount> [options]`

Build a SOL liquid-staking transaction.

```bash
# Build only (default) — prints unsigned tx as base64
soltools stake 1.5 --wallet 7xKX... --venue helius

# Sign and send with a local keypair (prompts for confirmation)
soltools stake 1.5 --keypair ~/.config/solana/id.json --venue helius

# Non-interactive (CI / scripts)
soltools stake 1.5 --keypair ~/.config/solana/id.json --venue helius --yes
```

Venues: `jito` | `phantom` | `helius` (default).

### `soltools deposit <usdcAmount> [options]`

Build a Kamino USDC deposit. Same `--wallet` / `--keypair` / `--yes` flags
as `stake`.

```bash
soltools deposit 500 --keypair ~/.config/solana/id.json
```

### `soltools watch <wallet> [options]`

Detect rebalance opportunities. State is persisted to `~/.soltools/watch.json`
so re-runs deduplicate.

```bash
# Single run
soltools watch 7xKX... --threshold 1.5

# Continuous loop, every 30 minutes
soltools watch 7xKX... --threshold 1.5 --interval 1800

# Clear stored opportunities and start fresh
soltools watch 7xKX... --reset
```

---

## Global options

- `--rpc-url <url>` — Override `HELIUS_RPC_URL` / `SOLANA_RPC_URL` for one call
- `--json` — Emit JSON instead of the human table

---

## Safety notes

- **soltools never holds your keys.** When you pass `--keypair`, the file is
  read locally; the secret is loaded only into this process's memory.
- **Confirmation prompt is on by default** for `--keypair` flows. `--yes`
  bypasses it; only use that in scripts you trust.
- **`expectedOut` / `expectedShares` are estimates.** Stake-pool exchange
  rates and Kamino collateral rates are not resolved; the numbers are
  upper bounds.
- **Mainnet only.** The stake pool addresses bundled in the SDK are
  mainnet. Don't point this at devnet expecting it to work.

---

## Development

```bash
npm run dev -- scan 7xKX...        # run via ts-node
npm run lint                       # tsc --noEmit
npm run build                      # emit dist/
```

When you edit the SDK, rebuild it with `(cd ../ZXY-Protocol-SDK && npm run build)`
so its `dist/` reflects the change — soltools imports from there.

---

## License

MIT — see [LICENSE](./LICENSE).
