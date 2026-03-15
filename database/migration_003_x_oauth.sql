-- OAuth pending state for X (Twitter) account linking (PKCE code_verifier stored until callback).
CREATE TABLE IF NOT EXISTS oauth_pending (
    state TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    code_verifier TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_created ON oauth_pending (created_at);

-- Allow cleanup of old rows; optional RLS
ALTER TABLE oauth_pending ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "OAuth pending read" ON oauth_pending;
DROP POLICY IF EXISTS "OAuth pending insert" ON oauth_pending;
DROP POLICY IF EXISTS "OAuth pending delete" ON oauth_pending;
CREATE POLICY "OAuth pending read" ON oauth_pending FOR SELECT USING (true);
CREATE POLICY "OAuth pending insert" ON oauth_pending FOR INSERT WITH CHECK (true);
CREATE POLICY "OAuth pending delete" ON oauth_pending FOR DELETE USING (true);
