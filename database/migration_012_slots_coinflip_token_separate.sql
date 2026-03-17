-- Slots and coinflip: one row per (wallet, token) so BUX and KNUKL state are separate
-- Purchases and wins do not persist across token toggle.

-- ─── Slots ─────────────────────────────────────────────────────────────────
-- 1. Create new table with composite PK
CREATE TABLE IF NOT EXISTS slots_players_new (
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL DEFAULT 'knukl',
    total_spins INTEGER DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    unclaimed_rewards BIGINT DEFAULT 0,
    spins_remaining INTEGER DEFAULT 0,
    cost_per_spin INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (wallet_address, token_used)
);

-- 2. Migrate existing rows (each wallet keeps its current row under its token_used)
INSERT INTO slots_players_new (wallet_address, token_used, total_spins, total_won, total_wagered, unclaimed_rewards, spins_remaining, cost_per_spin, created_at, updated_at)
SELECT wallet_address, COALESCE(NULLIF(LOWER(TRIM(token_used)), ''), 'knukl'), total_spins, total_won, total_wagered, unclaimed_rewards, spins_remaining, cost_per_spin, created_at, updated_at
FROM slots_players
ON CONFLICT (wallet_address, token_used) DO NOTHING;

-- 3. Drop FK from slots_game_history so we can drop slots_players
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_class rt ON rt.oid = c.confrelid
        WHERE c.contype = 'f'
          AND t.relname = 'slots_game_history'
          AND rt.relname = 'slots_players'
    LOOP
        EXECUTE format('ALTER TABLE slots_game_history DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

-- 4. Drop old table and rename
DROP TABLE IF EXISTS slots_players;
ALTER TABLE slots_players_new RENAME TO slots_players;

-- 5. Re-add composite FK (game history rows reference the player row for that token)
ALTER TABLE slots_game_history ADD CONSTRAINT slots_game_history_wallet_token_fkey
    FOREIGN KEY (wallet_address, token_used) REFERENCES slots_players(wallet_address, token_used) ON DELETE CASCADE;

-- 6. Indexes and trigger
CREATE INDEX IF NOT EXISTS idx_slots_players_total_won ON slots_players(total_won DESC);
CREATE INDEX IF NOT EXISTS idx_slots_players_total_spins ON slots_players(total_spins DESC);
CREATE INDEX IF NOT EXISTS idx_slots_players_wallet_token ON slots_players(wallet_address, token_used);

DROP TRIGGER IF EXISTS update_slots_players_updated_at ON slots_players;
CREATE TRIGGER update_slots_players_updated_at BEFORE UPDATE ON slots_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE slots_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Slots players read" ON slots_players;
DROP POLICY IF EXISTS "Slots players insert" ON slots_players;
DROP POLICY IF EXISTS "Slots players update" ON slots_players;
CREATE POLICY "Slots players read" ON slots_players FOR SELECT USING (true);
CREATE POLICY "Slots players insert" ON slots_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Slots players update" ON slots_players FOR UPDATE USING (true);

-- ─── Coinflip ──────────────────────────────────────────────────────────────
-- 1. Create new table with composite PK
CREATE TABLE IF NOT EXISTS coinflip_players_new (
    wallet_address TEXT NOT NULL,
    token_used TEXT NOT NULL DEFAULT 'knukl',
    total_flips INTEGER DEFAULT 0,
    total_won BIGINT DEFAULT 0,
    total_wagered BIGINT DEFAULT 0,
    unclaimed_rewards BIGINT DEFAULT 0,
    flips_remaining INTEGER DEFAULT 0,
    cost_per_flip INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (wallet_address, token_used)
);

-- 2. Migrate existing rows
INSERT INTO coinflip_players_new (wallet_address, token_used, total_flips, total_won, total_wagered, unclaimed_rewards, flips_remaining, cost_per_flip, created_at, updated_at)
SELECT wallet_address, COALESCE(NULLIF(LOWER(TRIM(token_used)), ''), 'knukl'), total_flips, total_won, total_wagered, unclaimed_rewards, flips_remaining, cost_per_flip, created_at, updated_at
FROM coinflip_players
ON CONFLICT (wallet_address, token_used) DO NOTHING;

-- 3. Drop old table and rename
DROP TABLE IF EXISTS coinflip_players;
ALTER TABLE coinflip_players_new RENAME TO coinflip_players;

-- 4. Indexes and trigger
CREATE INDEX IF NOT EXISTS idx_coinflip_players_total_won ON coinflip_players(total_won DESC);
CREATE INDEX IF NOT EXISTS idx_coinflip_players_total_flips ON coinflip_players(total_flips DESC);
CREATE INDEX IF NOT EXISTS idx_coinflip_players_wallet_token ON coinflip_players(wallet_address, token_used);

DROP TRIGGER IF EXISTS update_coinflip_players_updated_at ON coinflip_players;
CREATE TRIGGER update_coinflip_players_updated_at BEFORE UPDATE ON coinflip_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE coinflip_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coinflip players read" ON coinflip_players;
DROP POLICY IF EXISTS "Coinflip players insert" ON coinflip_players;
DROP POLICY IF EXISTS "Coinflip players update" ON coinflip_players;
CREATE POLICY "Coinflip players read" ON coinflip_players FOR SELECT USING (true);
CREATE POLICY "Coinflip players insert" ON coinflip_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Coinflip players update" ON coinflip_players FOR UPDATE USING (true);