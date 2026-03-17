-- Migration: add Discord users, user_wallets, slots token_used, slots_purchases
-- Run this if you already have players + game_history (e.g. from an earlier schema.sql).
-- Then run migration_009 to rename players -> slots_players, game_history -> slots_game_history.

-- Discord: users and wallet links
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

-- Slots: add token_used to players (which token the remaining spins were bought with)
ALTER TABLE players ADD COLUMN IF NOT EXISTS token_used TEXT DEFAULT 'knukl';
UPDATE players SET token_used = 'knukl' WHERE token_used IS NULL;

-- Slots: add token_used to game_history (optional, for analytics)
ALTER TABLE game_history ADD COLUMN IF NOT EXISTS token_used TEXT DEFAULT 'knukl';

-- Slots: audit log of purchases
CREATE TABLE IF NOT EXISTS slots_purchases (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL,
    cost_per_spin INTEGER NOT NULL,
    num_spins INTEGER NOT NULL,
    total_cost_raw BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_purchases_wallet ON slots_purchases(wallet_address);

-- Triggers for users.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS for new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots_purchases ENABLE ROW LEVEL SECURITY;

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
