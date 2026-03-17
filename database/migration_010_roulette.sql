-- Roulette game: chips-based, same token (knukl/bux) as slots/coinflip
CREATE TABLE IF NOT EXISTS roulette_players (
    wallet_address TEXT PRIMARY KEY,
    total_spins INTEGER DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    unclaimed_rewards BIGINT DEFAULT 0,
    chips_balance INTEGER DEFAULT 0,
    cost_per_chip INTEGER DEFAULT 100,
    token_used TEXT DEFAULT 'knukl',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roulette_game_history (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    spin_cost BIGINT NOT NULL,
    result_number TEXT NOT NULL,
    won_amount BIGINT DEFAULT 0,
    token_used TEXT DEFAULT 'knukl',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roulette_purchases (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL,
    cost_per_chip INTEGER NOT NULL,
    num_chips INTEGER NOT NULL,
    total_cost_raw BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roulette_game_history_wallet ON roulette_game_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_roulette_game_history_timestamp ON roulette_game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_players_total_won ON roulette_players(total_won DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_players_total_spins ON roulette_players(total_spins DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_purchases_wallet ON roulette_purchases(wallet_address);

DROP TRIGGER IF EXISTS update_roulette_players_updated_at ON roulette_players;
CREATE TRIGGER update_roulette_players_updated_at BEFORE UPDATE ON roulette_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE roulette_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE roulette_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Roulette players read" ON roulette_players;
DROP POLICY IF EXISTS "Roulette players insert" ON roulette_players;
DROP POLICY IF EXISTS "Roulette players update" ON roulette_players;
CREATE POLICY "Roulette players read" ON roulette_players FOR SELECT USING (true);
CREATE POLICY "Roulette players insert" ON roulette_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Roulette players update" ON roulette_players FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Roulette game history read" ON roulette_game_history;
DROP POLICY IF EXISTS "Roulette game history insert" ON roulette_game_history;
CREATE POLICY "Roulette game history read" ON roulette_game_history FOR SELECT USING (true);
CREATE POLICY "Roulette game history insert" ON roulette_game_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Roulette purchases read" ON roulette_purchases;
DROP POLICY IF EXISTS "Roulette purchases insert" ON roulette_purchases;
CREATE POLICY "Roulette purchases read" ON roulette_purchases FOR SELECT USING (true);
CREATE POLICY "Roulette purchases insert" ON roulette_purchases FOR INSERT WITH CHECK (true);
