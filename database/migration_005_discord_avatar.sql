-- Add Discord avatar hash to users (for CDN URL: cdn.discordapp.com/avatars/{id}/{avatar}.png)
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar TEXT;
