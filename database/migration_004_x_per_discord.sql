-- X link per Discord user (one X account per discord id). Migrate from wallet-based to user-based.

-- New table: one X account per user (Discord user). One X account can only be linked to one user.
CREATE TABLE IF NOT EXISTS user_x_linked (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    x_user_id TEXT NOT NULL,
    x_username TEXT,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id),
    UNIQUE (x_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_x_linked_user_id ON user_x_linked (user_id);

-- Migrate existing wallet-based links: wallet -> user_id via user_wallets, then copy to user_x_linked
INSERT INTO user_x_linked (user_id, x_user_id, x_username, linked_at)
SELECT u.id, x.x_user_id, x.x_username, x.linked_at
FROM user_x_accounts x
JOIN user_wallets w ON w.wallet_address = x.wallet_address
JOIN users u ON u.id = w.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Drop old wallet-based table
DROP TABLE IF EXISTS user_x_accounts;

-- oauth_pending: store user_id for X OAuth (so we link X to Discord user, not wallet)
ALTER TABLE oauth_pending ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE oauth_pending ALTER COLUMN wallet_address DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oauth_pending_user_id ON oauth_pending (user_id);

-- RLS
ALTER TABLE user_x_linked ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User X linked read" ON user_x_linked;
DROP POLICY IF EXISTS "User X linked insert" ON user_x_linked;
DROP POLICY IF EXISTS "User X linked update" ON user_x_linked;
CREATE POLICY "User X linked read" ON user_x_linked FOR SELECT USING (true);
CREATE POLICY "User X linked insert" ON user_x_linked FOR INSERT WITH CHECK (true);
CREATE POLICY "User X linked update" ON user_x_linked FOR UPDATE USING (true);
