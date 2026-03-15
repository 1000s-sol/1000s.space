// GET /api/discord/callback?code=... — exchange code for token, get user, create/find in DB, redirect to app with discord_id
const { sql, setCors, json } = require("../slots-helpers.cjs");

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_ME_URL = "https://discord.com/api/users/@me";

function getFrontendRedirect(req) {
  const host = (req.headers?.host || "").toLowerCase();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  if (isLocal && process.env.SITE_URL_DEV) return process.env.SITE_URL_DEV;
  return process.env.SITE_URL || "http://localhost:5173";
}

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const code = req.query?.code;
  if (!code) {
    redirectToApp(res, req, null, "missing_code");
    return;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const host = (req.headers?.host || "").toLowerCase();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const redirectUri = isLocal && process.env.DISCORD_REDIRECT_URI_DEV
    ? process.env.DISCORD_REDIRECT_URI_DEV
    : process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    redirectToApp(res, req, null, "oauth_not_configured");
    return;
  }
  if (!sql) {
    redirectToApp(res, req, null, "database_error");
    return;
  }

  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  let tokenRes;
  try {
    tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });
  } catch (e) {
    console.error("discord callback: token exchange", e);
    redirectToApp(res, req, null, "token_failed");
    return;
  }

  if (!tokenRes.ok) {
    console.error("discord callback: token error", tokenRes.status, await tokenRes.text());
    redirectToApp(res, req, null, "token_error");
    return;
  }

  let tokenData;
  try {
    tokenData = await tokenRes.json();
  } catch (_) {
    redirectToApp(res, req, null, "token_parse_error");
    return;
  }

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    redirectToApp(res, req, null, "no_access_token");
    return;
  }

  let userRes;
  try {
    userRes = await fetch(DISCORD_ME_URL, {
      headers: { Authorization: "Bearer " + accessToken },
    });
  } catch (e) {
    console.error("discord callback: users/@me", e);
    redirectToApp(res, req, null, "user_fetch_failed");
    return;
  }

  if (!userRes.ok) {
    console.error("discord callback: users/@me error", userRes.status);
    redirectToApp(res, req, null, "user_error");
    return;
  }

  let userData;
  try {
    userData = await userRes.json();
  } catch (_) {
    redirectToApp(res, req, null, "user_parse_error");
    return;
  }

  const discordId = userData.id;
  const discordUsername = userData.username ?? null;
  const discordAvatar = userData.avatar ?? null;
  if (!discordId) {
    redirectToApp(res, req, null, "no_discord_id");
    return;
  }

  try {
    const existing = await sql`
      SELECT id FROM users WHERE discord_id = ${discordId}
    `;
    if (existing[0]) {
      await sql`
        UPDATE users SET discord_username = ${discordUsername}, discord_avatar = ${discordAvatar}, updated_at = NOW() WHERE discord_id = ${discordId}
      `;
    } else {
      await sql`
        INSERT INTO users (discord_id, discord_username, discord_avatar) VALUES (${discordId}, ${discordUsername}, ${discordAvatar})
      `;
    }
  } catch (e) {
    console.error("discord callback: save user", e);
    redirectToApp(res, req, null, "save_failed");
    return;
  }

  redirectToApp(res, req, { discordId, discordUsername, discordAvatar }, null);
}

function redirectToApp(res, req, user, error) {
  const base = getFrontendRedirect(req);
  const url = new URL(base);
  if (user) {
    url.searchParams.set("discord_id", user.discordId);
    if (user.discordUsername) url.searchParams.set("discord_username", encodeURIComponent(user.discordUsername));
    if (user.discordAvatar) url.searchParams.set("discord_avatar", user.discordAvatar);
  }
  if (error) url.searchParams.set("discord_error", error);
  res.writeHead(302, { Location: url.toString() });
  res.end();
}

module.exports = handler;
module.exports.handler = handler;
