-- 1000s Neon Postgres — full schema
-- Run in Neon SQL Editor. For existing DBs that already have players/game_history, run migration_001 then migration_009 to rename to slots_*.

-- ─── Discord users (link multiple wallets to one Discord) ───
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    discord_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_wallets (
    wallet_address TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

-- ─── Slots: player state (persists across refresh/disconnect) ───
CREATE TABLE IF NOT EXISTS slots_players (
    wallet_address TEXT PRIMARY KEY,
    total_spins INTEGER DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    unclaimed_rewards BIGINT DEFAULT 0,
    spins_remaining INTEGER DEFAULT 0,
    cost_per_spin INTEGER DEFAULT 100,
    token_used TEXT DEFAULT 'knukl',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slots_game_history (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL REFERENCES slots_players(wallet_address) ON DELETE CASCADE,
    spin_cost BIGINT NOT NULL,
    result_symbols INTEGER[] NOT NULL,
    won_amount BIGINT DEFAULT 0,
    token_used TEXT DEFAULT 'knukl',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log of slot purchases (buy events)
CREATE TABLE IF NOT EXISTS slots_purchases (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL,
    cost_per_spin INTEGER NOT NULL,
    num_spins INTEGER NOT NULL,
    total_cost_raw BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_game_history_wallet ON slots_game_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_slots_game_history_timestamp ON slots_game_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_slots_players_total_won ON slots_players(total_won DESC);
CREATE INDEX IF NOT EXISTS idx_slots_players_total_spins ON slots_players(total_spins DESC);
CREATE INDEX IF NOT EXISTS idx_slots_purchases_wallet ON slots_purchases(wallet_address);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_slots_players_updated_at ON slots_players;
CREATE TRIGGER update_slots_players_updated_at BEFORE UPDATE ON slots_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS (optional)
ALTER TABLE slots_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots_game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Slots players read" ON slots_players;
DROP POLICY IF EXISTS "Slots players insert" ON slots_players;
DROP POLICY IF EXISTS "Slots players update" ON slots_players;
CREATE POLICY "Slots players read" ON slots_players FOR SELECT USING (true);
CREATE POLICY "Slots players insert" ON slots_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Slots players update" ON slots_players FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Slots game history read" ON slots_game_history;
DROP POLICY IF EXISTS "Slots game history insert" ON slots_game_history;
CREATE POLICY "Slots game history read" ON slots_game_history FOR SELECT USING (true);
CREATE POLICY "Slots game history insert" ON slots_game_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users read" ON users;
DROP POLICY IF EXISTS "Users insert" ON users;
DROP POLICY IF EXISTS "Users update" ON users;
CREATE POLICY "Users read" ON users FOR SELECT USING (true);
CREATE POLICY "Users insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update" ON users FOR UPDATE USING (true);

DROP POLICY IF EXISTS "User wallets read" ON user_wallets;
DROP POLICY IF EXISTS "User wallets insert" ON user_wallets;
DROP POLICY IF EXISTS "User wallets delete" ON user_wallets;
CREATE POLICY "User wallets read" ON user_wallets FOR SELECT USING (true);
CREATE POLICY "User wallets insert" ON user_wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "User wallets delete" ON user_wallets FOR DELETE USING (true);

DROP POLICY IF EXISTS "Slots purchases read" ON slots_purchases;
DROP POLICY IF EXISTS "Slots purchases insert" ON slots_purchases;
CREATE POLICY "Slots purchases read" ON slots_purchases FOR SELECT USING (true);
CREATE POLICY "Slots purchases insert" ON slots_purchases FOR INSERT WITH CHECK (true);
