-- Casino daily totals (ET): per wallet + token + game aggregation
-- Used for airdrop allocation breakdown and fast lookups.

CREATE TABLE IF NOT EXISTS casino_daily_totals (
    date_et TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL DEFAULT 'knukl',
    game_type TEXT NOT NULL, -- slots | coinflip | roulette
    plays INTEGER NOT NULL DEFAULT 0,
    spent_raw BIGINT NOT NULL DEFAULT 0, -- token amount in 1e6 (same scale as *_game_history costs)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (date_et, wallet_address, token_used, game_type)
);

CREATE INDEX IF NOT EXISTS idx_casino_daily_totals_wallet_date
  ON casino_daily_totals (wallet_address, date_et);

CREATE INDEX IF NOT EXISTS idx_casino_daily_totals_date_token_game
  ON casino_daily_totals (date_et, token_used, game_type);

DROP TRIGGER IF EXISTS update_casino_daily_totals_updated_at ON casino_daily_totals;
CREATE TRIGGER update_casino_daily_totals_updated_at BEFORE UPDATE ON casino_daily_totals
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE casino_daily_totals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Casino daily totals read" ON casino_daily_totals;
DROP POLICY IF EXISTS "Casino daily totals insert" ON casino_daily_totals;
DROP POLICY IF EXISTS "Casino daily totals update" ON casino_daily_totals;
CREATE POLICY "Casino daily totals read" ON casino_daily_totals FOR SELECT USING (true);
CREATE POLICY "Casino daily totals insert" ON casino_daily_totals FOR INSERT WITH CHECK (true);
CREATE POLICY "Casino daily totals update" ON casino_daily_totals FOR UPDATE USING (true);

