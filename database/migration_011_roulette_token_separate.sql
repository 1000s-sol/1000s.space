-- Roulette: one row per (wallet, token) so BUX and KNUKL state are separate
-- 1. Create new table with composite PK
CREATE TABLE IF NOT EXISTS roulette_players_new (
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL DEFAULT 'knukl',
    total_spins INTEGER DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    unclaimed_rewards BIGINT DEFAULT 0,
    chips_balance INTEGER DEFAULT 0,
    cost_per_chip INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (wallet_address, token_used)
);

-- 2. Migrate existing rows (each wallet keeps its current row)
INSERT INTO roulette_players_new (wallet_address, token_used, total_spins, total_won, total_wagered, unclaimed_rewards, chips_balance, cost_per_chip, created_at, updated_at)
SELECT wallet_address, COALESCE(NULLIF(LOWER(TRIM(token_used)), ''), 'knukl'), total_spins, total_won, total_wagered, unclaimed_rewards, chips_balance, cost_per_chip, created_at, updated_at
FROM roulette_players
ON CONFLICT (wallet_address, token_used) DO NOTHING;

-- 3. Drop old table and rename
DROP TABLE IF EXISTS roulette_players;
ALTER TABLE roulette_players_new RENAME TO roulette_players;

-- 4. Indexes and trigger
CREATE INDEX IF NOT EXISTS idx_roulette_players_total_won ON roulette_players(total_won DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_players_total_spins ON roulette_players(total_spins DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_players_wallet_token ON roulette_players(wallet_address, token_used);

DROP TRIGGER IF EXISTS update_roulette_players_updated_at ON roulette_players;
CREATE TRIGGER update_roulette_players_updated_at BEFORE UPDATE ON roulette_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE roulette_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Roulette players read" ON roulette_players;
DROP POLICY IF EXISTS "Roulette players insert" ON roulette_players;
DROP POLICY IF EXISTS "Roulette players update" ON roulette_players;
CREATE POLICY "Roulette players read" ON roulette_players FOR SELECT USING (true);
CREATE POLICY "Roulette players insert" ON roulette_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Roulette players update" ON roulette_players FOR UPDATE USING (true);
