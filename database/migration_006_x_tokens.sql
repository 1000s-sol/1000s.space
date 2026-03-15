-- Store X OAuth access token so we can check who the user follows (allocation 10 per account).
ALTER TABLE user_x_linked ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE user_x_linked ADD COLUMN IF NOT EXISTS refresh_token TEXT;
