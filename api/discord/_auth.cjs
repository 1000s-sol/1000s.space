// GET /api/discord/auth — redirect to Discord OAuth2. Callback: /api/discord/callback
const { setCors, json } = require("../slots-helpers.cjs");

const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
const SCOPE = "identify";

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const clientId = process.env.DISCORD_CLIENT_ID;
  const isDev = req.query?.dev === "1" || req.query?.dev === "true";
  const redirectUri = isDev && process.env.DISCORD_REDIRECT_URI_DEV
    ? process.env.DISCORD_REDIRECT_URI_DEV
    : process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return json(res, 500, { error: "Discord OAuth not configured", message: "Set DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI" + (isDev ? " (and DISCORD_REDIRECT_URI_DEV for dev)" : "") });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
  });
  res.writeHead(302, { Location: `${DISCORD_AUTHORIZE_URL}?${params.toString()}` });
  res.end();
}

module.exports = handler;
module.exports.handler = handler;
