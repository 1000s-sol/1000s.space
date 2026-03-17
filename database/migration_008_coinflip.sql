-- Coin flip game: separate tables (slots tables stay as-is for slots)
-- Run after migration_001 (or schema.sql). If using legacy names, run migration_009 so Neon has slots_players/slots_game_history/slots_purchases.

-- Coin flip: player state
CREATE TABLE IF NOT EXISTS coinflip_players (
    wallet_address TEXT PRIMARY KEY,
    total_flips INTEGER DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    unclaimed_rewards BIGINT DEFAULT 0,
    flips_remaining INTEGER DEFAULT 0,
    cost_per_flip INTEGER DEFAULT 100,
    token_used TEXT DEFAULT 'knukl',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coin flip: per-flip history
CREATE TABLE IF NOT EXISTS coinflip_game_history (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    flip_cost BIGINT NOT NULL,
    choice TEXT NOT NULL,
    result TEXT NOT NULL,
    won_amount BIGINT DEFAULT 0,
    token_used TEXT DEFAULT 'knukl',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coin flip: audit log of buy-flips
CREATE TABLE IF NOT EXISTS coinflip_purchases (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL,
    cost_per_flip INTEGER NOT NULL,
    num_flips INTEGER NOT NULL,
    total_cost_raw BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coinflip_game_history_wallet ON coinflip_game_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_coinflip_game_history_timestamp ON coinflip_game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coinflip_players_total_won ON coinflip_players(total_won DESC);
CREATE INDEX IF NOT EXISTS idx_coinflip_players_total_flips ON coinflip_players(total_flips DESC);
CREATE INDEX IF NOT EXISTS idx_coinflip_purchases_wallet ON coinflip_purchases(wallet_address);

-- Auto-update updated_at for coinflip_players
DROP TRIGGER IF EXISTS update_coinflip_players_updated_at ON coinflip_players;
CREATE TRIGGER update_coinflip_players_updated_at BEFORE UPDATE ON coinflip_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE coinflip_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE coinflip_game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE coinflip_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coinflip players read" ON coinflip_players;
DROP POLICY IF EXISTS "Coinflip players insert" ON coinflip_players;
DROP POLICY IF EXISTS "Coinflip players update" ON coinflip_players;
CREATE POLICY "Coinflip players read" ON coinflip_players FOR SELECT USING (true);
CREATE POLICY "Coinflip players insert" ON coinflip_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Coinflip players update" ON coinflip_players FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Coinflip game history read" ON coinflip_game_history;
DROP POLICY IF EXISTS "Coinflip game history insert" ON coinflip_game_history;
CREATE POLICY "Coinflip game history read" ON coinflip_game_history FOR SELECT USING (true);
CREATE POLICY "Coinflip game history insert" ON coinflip_game_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Coinflip purchases read" ON coinflip_purchases;
DROP POLICY IF EXISTS "Coinflip purchases insert" ON coinflip_purchases;
CREATE POLICY "Coinflip purchases read" ON coinflip_purchases FOR SELECT USING (true);
CREATE POLICY "Coinflip purchases insert" ON coinflip_purchases FOR INSERT WITH CHECK (true);
