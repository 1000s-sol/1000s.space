-- Indexes for “total spent on spins in the last 24 hours” (airdrop allocations).
-- Run in Neon SQL Editor after schema / migration_001.

-- Wagered in last 24h: SUM(game_history.spin_cost) WHERE wallet = ? AND timestamp >= now() - interval '24 hours'
CREATE INDEX IF NOT EXISTS idx_game_history_wallet_timestamp
  ON game_history (wallet_address, timestamp DESC);

-- Purchased in last 24h: SUM(slots_purchases.total_cost_raw) WHERE wallet = ? AND created_at >= now() - interval '24 hours'
CREATE INDEX IF NOT EXISTS idx_slots_purchases_wallet_created
  ON slots_purchases (wallet_address, created_at DESC);
