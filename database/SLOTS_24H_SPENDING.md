# Slots: total spent in last 24 hours (for airdrop allocations)

The DB is set up so you can efficiently query **total spent on spins in the previous 24 hours** per wallet.

## Tables and indexes

- **`game_history`** – one row per spin: `wallet_address`, `spin_cost` (raw, 6 decimals), `won_amount`, `token_used`, `timestamp`.
- **`slots_purchases`** – one row per purchase: `wallet_address`, `total_cost_raw`, `token_used`, `created_at`.

After running `migration_007_slots_24h_spending.sql`, these indexes exist:

- `idx_game_history_wallet_timestamp` on `(wallet_address, timestamp DESC)`
- `idx_slots_purchases_wallet_created` on `(wallet_address, created_at DESC)`

## Example queries

**Total wagered (spin cost) in last 24h per wallet** (good for “activity” in airdrop):

```sql
SELECT
  wallet_address,
  SUM(spin_cost) AS total_wagered_raw_24h
FROM game_history
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY wallet_address;
```

**Total purchased (buy events) in last 24h per wallet**:

```sql
SELECT
  wallet_address,
  SUM(total_cost_raw) AS total_purchased_raw_24h
FROM slots_purchases
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY wallet_address;
```

**Single wallet – total wagered in last 24h** (for allocation checks):

```sql
SELECT COALESCE(SUM(spin_cost), 0) AS total_wagered_raw_24h
FROM game_history
WHERE wallet_address = $1
  AND timestamp >= NOW() - INTERVAL '24 hours';
```

Amounts are stored in **raw** form (e.g. 6 decimals for legacy, 9 for BUX). Convert to human: `total_raw / 10^decimals` (use `token_used` on the row or from `players` to choose decimals).
