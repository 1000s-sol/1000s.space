-- Rename slots tables: players -> slots_players, game_history -> slots_game_history
-- slots_purchases already has correct name. Run after migration_001 (and 007 if used).

ALTER TABLE players RENAME TO slots_players;

ALTER TABLE game_history RENAME TO slots_game_history;

ALTER INDEX IF EXISTS idx_players_total_won RENAME TO idx_slots_players_total_won;

ALTER INDEX IF EXISTS idx_players_total_spins RENAME TO idx_slots_players_total_spins;

ALTER INDEX IF EXISTS idx_game_history_wallet RENAME TO idx_slots_game_history_wallet;

ALTER INDEX IF EXISTS idx_game_history_timestamp RENAME TO idx_slots_game_history_timestamp;

ALTER INDEX IF EXISTS idx_game_history_wallet_timestamp RENAME TO idx_slots_game_history_wallet_timestamp;

DROP TRIGGER IF EXISTS update_players_updated_at ON slots_players;

CREATE TRIGGER update_slots_players_updated_at BEFORE UPDATE ON slots_players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP POLICY IF EXISTS "Players read" ON slots_players;

DROP POLICY IF EXISTS "Players can read" ON slots_players;

DROP POLICY IF EXISTS "Players insert" ON slots_players;

DROP POLICY IF EXISTS "Players can insert" ON slots_players;

DROP POLICY IF EXISTS "Players update" ON slots_players;

DROP POLICY IF EXISTS "Players can update" ON slots_players;

CREATE POLICY "Slots players read" ON slots_players FOR SELECT USING (true);

CREATE POLICY "Slots players insert" ON slots_players FOR INSERT WITH CHECK (true);

CREATE POLICY "Slots players update" ON slots_players FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Game history read" ON slots_game_history;

DROP POLICY IF EXISTS "Anyone can read game history" ON slots_game_history;

DROP POLICY IF EXISTS "Game history insert" ON slots_game_history;

DROP POLICY IF EXISTS "Players can insert game history" ON slots_game_history;

CREATE POLICY "Slots game history read" ON slots_game_history FOR SELECT USING (true);

CREATE POLICY "Slots game history insert" ON slots_game_history FOR INSERT WITH CHECK (true);
