# Database setup (Slots) — Neon Postgres

Uses **Neon** (serverless Postgres) for player data, game history, and leaderboard.

## 1. Neon

1. Create an account at [neon.tech](https://neon.tech) and create a project (e.g. from the [Neon Console](https://console.neon.tech)).
2. In the project dashboard, copy the **connection string** (e.g. `postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`).
3. Optional: run `npx neonctl@latest init` in the repo to link the project and get a local `DATABASE_URL` (see Neon + Cursor/IDE docs).

## 2. Environment variables

Add to `.env` (and to Vercel/hosting env for production):

```bash
# Neon Postgres (required for slots save/load/leaderboard/collect)
DATABASE_URL=postgres://user:password@host.neon.tech/neondb?sslmode=require

# Treasury wallet private key (required for COLLECT — pays out winnings)
# Format: JSON array [1,2,3,...,64] or base58 string
TREASURY_PRIVATE_KEY=[...]
```

Optional:

- `TREASURY_WALLET` — treasury address (default in code)
- `SLOTS_TOKEN_MINT` — token mint for payouts (default from env or code)
- `SLOTS_RPC_URL` — RPC for collect/confirm (defaults to Helius with `HELIUS_API_KEY`)

## 3. Create tables and migrations

- **Fresh install:** In the **Neon SQL Editor**, run the contents of **`database/schema.sql`**.
- **Existing DB (already have `players` / `game_history`):** Run **`database/migration_001_discord_and_slots.sql`** in the Neon SQL Editor (or run `npm run db:migrate` if you have `psql` and `DATABASE_URL` set).

Schema includes:

- **`users`** — Discord users (id, discord_id, discord_username)
- **`user_wallets`** — Links wallets to users (wallet_address, user_id) so multiple wallets can map to one Discord user
- **`players`** — wallet_address, total_spins, total_won, total_wagered, unclaimed_rewards, spins_remaining, cost_per_spin, **token_used** (bux/knukl), created_at, updated_at
- **`game_history`** — id, wallet_address, spin_cost, result_symbols, won_amount, **token_used**, timestamp
- **`slots_purchases`** — Audit log of buy events (wallet_address, token_used, cost_per_spin, num_spins, total_cost_raw)

## 4. API routes (server.cjs)

When `DATABASE_URL` is set, the API server exposes:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/save-game` | Save purchase or spin (slots) |
| GET | `/api/load-player` | Load player state (walletAddress, gameType=slots) |
| GET | `/api/game-stats` | Grand totals (spins, won, wagered) |
| GET | `/api/leaderboard` | Leaderboard (sortBy=spins\|won\|winRate, limit=100) |
| POST | `/api/collect` | Create signed collect transaction (body: userWallet, amount) |
| POST | `/api/confirm-collect` | Clear unclaimed_rewards after tx confirmed (body: userWallet, signature, amount) |

CORS allows `http://localhost:5173` and `https://1000s.space`.

## 5. Treasury wallet

For **COLLECT** to work, set `TREASURY_PRIVATE_KEY` (and optionally `TREASURY_WALLET`, `SLOTS_TOKEN_MINT`). Fund the treasury with the token and SOL for fees.
