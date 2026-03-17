-- Add indexes to speed up “previous 24h casino play” queries by wallet+token+timestamp

-- Slots
CREATE INDEX IF NOT EXISTS idx_slots_game_history_wallet_token_ts
  ON slots_game_history (wallet_address, token_used, timestamp DESC);

-- Coinflip
CREATE INDEX IF NOT EXISTS idx_coinflip_game_history_wallet_token_ts
  ON coinflip_game_history (wallet_address, token_used, timestamp DESC);

-- Roulette
CREATE INDEX IF NOT EXISTS idx_roulette_game_history_wallet_token_ts
  ON roulette_game_history (wallet_address, token_used, timestamp DESC);

