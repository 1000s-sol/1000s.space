-- Daily airdrop eligibility and X/Discord linking for airdrop page.
-- Run after schema.sql + migration_001_discord_and_slots.sql.

-- Daily allocation per wallet per day (America/New_York date).
CREATE TABLE IF NOT EXISTS daily_airdrop_eligibility (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    date_et DATE NOT NULL,
    allocation_archive NUMERIC(20, 6) DEFAULT 0,
    allocation_casino NUMERIC(20, 6) DEFAULT 0,
    allocation_x NUMERIC(20, 6) DEFAULT 0,
    allocation_discord NUMERIC(20, 6) DEFAULT 0,
    claimed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (wallet_address, date_et)
);

CREATE INDEX IF NOT EXISTS idx_daily_airdrop_wallet_date ON daily_airdrop_eligibility (wallet_address, date_et);

-- Wallet <-> X (Twitter) account linking for X engagement verification.
CREATE TABLE IF NOT EXISTS user_x_accounts (
    id BIGSERIAL PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    x_user_id TEXT NOT NULL,
    x_username TEXT,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_x_wallet ON user_x_accounts (wallet_address);

-- Discord daily engagement (filled by bot or cron).
CREATE TABLE IF NOT EXISTS daily_discord_engagement (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL,
    date_et DATE NOT NULL,
    messages_count INT DEFAULT 0,
    reacted_to_daily BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (discord_id, date_et)
);

CREATE INDEX IF NOT EXISTS idx_daily_discord_discord_date ON daily_discord_engagement (discord_id, date_et);

-- RLS
ALTER TABLE daily_airdrop_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_x_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_discord_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Daily airdrop read" ON daily_airdrop_eligibility;
DROP POLICY IF EXISTS "Daily airdrop insert" ON daily_airdrop_eligibility;
DROP POLICY IF EXISTS "Daily airdrop update" ON daily_airdrop_eligibility;
CREATE POLICY "Daily airdrop read" ON daily_airdrop_eligibility FOR SELECT USING (true);
CREATE POLICY "Daily airdrop insert" ON daily_airdrop_eligibility FOR INSERT WITH CHECK (true);
CREATE POLICY "Daily airdrop update" ON daily_airdrop_eligibility FOR UPDATE USING (true);

DROP POLICY IF EXISTS "User X read" ON user_x_accounts;
DROP POLICY IF EXISTS "User X insert" ON user_x_accounts;
CREATE POLICY "User X read" ON user_x_accounts FOR SELECT USING (true);
CREATE POLICY "User X insert" ON user_x_accounts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Daily discord read" ON daily_discord_engagement;
DROP POLICY IF EXISTS "Daily discord insert" ON daily_discord_engagement;
CREATE POLICY "Daily discord read" ON daily_discord_engagement FOR SELECT USING (true);
CREATE POLICY "Daily discord insert" ON daily_discord_engagement FOR INSERT WITH CHECK (true);
