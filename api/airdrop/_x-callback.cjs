// GET /api/airdrop/x-callback?code=...&state=...
// X OAuth callback: exchange code for token, get user, link to Discord user (user_id), redirect to app.
const { sql, setCors, json } = require("../slots-helpers.cjs");

const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_USERS_ME_URL = "https://api.x.com/2/users/me";

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
  const state = req.query?.state;
  if (!code || !state) {
    redirectToApp(res, req, false, "missing_code_or_state");
    return;
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const host = (req.headers?.host || "").toLowerCase();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const redirectUri = isLocal && process.env.X_REDIRECT_URI_DEV
    ? process.env.X_REDIRECT_URI_DEV
    : process.env.X_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    redirectToApp(res, req, false, "oauth_not_configured");
    return;
  }
  if (!sql) {
    redirectToApp(res, req, false, "database_error");
    return;
  }

  let row;
  try {
    const rows = await sql`
      SELECT user_id, code_verifier FROM oauth_pending WHERE state = ${state}
    `;
    row = rows[0];
  } catch (e) {
    console.error("x-callback: select oauth_pending", e);
    redirectToApp(res, req, false, "database_error");
    return;
  }

  if (!row || row.user_id == null) {
    redirectToApp(res, req, false, "invalid_or_expired_state");
    return;
  }

  const { user_id: userId, code_verifier: codeVerifier } = row;

  const tokenBody = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  let tokenRes;
  try {
    tokenRes = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
      body: tokenBody.toString(),
    });
  } catch (e) {
    console.error("x-callback: token exchange", e);
    redirectToApp(res, req, false, "token_exchange_failed");
    return;
  }

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("x-callback: token error", tokenRes.status, errText);
    redirectToApp(res, req, false, "token_error");
    return;
  }

  let tokenData;
  try {
    tokenData = await tokenRes.json();
  } catch (_) {
    redirectToApp(res, req, false, "token_parse_error");
    return;
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token ?? null;
  if (!accessToken) {
    redirectToApp(res, req, false, "no_access_token");
    return;
  }

  let userRes;
  try {
    userRes = await fetch(X_USERS_ME_URL, {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    });
  } catch (e) {
    console.error("x-callback: users/me", e);
    redirectToApp(res, req, false, "user_fetch_failed");
    return;
  }

  if (!userRes.ok) {
    console.error("x-callback: users/me error", userRes.status);
    redirectToApp(res, req, false, "user_error");
    return;
  }

  let userData;
  try {
    userData = await userRes.json();
  } catch (_) {
    redirectToApp(res, req, false, "user_parse_error");
    return;
  }

  const xUserId = userData.data?.id;
  const xUsername = userData.data?.username ? `@${userData.data.username}` : null;
  if (!xUserId) {
    redirectToApp(res, req, false, "no_user_id");
    return;
  }

  try {
    await sql`DELETE FROM oauth_pending WHERE state = ${state}`;
    await sql`
      INSERT INTO user_x_linked (user_id, x_user_id, x_username, access_token, refresh_token)
      VALUES (${userId}, ${xUserId}, ${xUsername}, ${accessToken}, ${refreshToken})
      ON CONFLICT (user_id) DO UPDATE SET
        x_user_id = ${xUserId},
        x_username = ${xUsername},
        access_token = ${accessToken},
        refresh_token = ${refreshToken}
    `;
  } catch (e) {
    if (e.code === "23505") {
      redirectToApp(res, req, false, "x_already_linked"); // x_user_id unique: this X account is linked to another Discord user
      return;
    }
    console.error("x-callback: save link", e);
    redirectToApp(res, req, false, "save_failed");
    return;
  }

  redirectToApp(res, req, true, null, xUsername);
}

function redirectToApp(res, req, success, error, username) {
  const base = getFrontendRedirect(req);
  const url = new URL(base);
  url.searchParams.set("x_linked", success ? "1" : "0");
  if (error) url.searchParams.set("x_error", error);
  if (username) url.searchParams.set("x_username", encodeURIComponent(username));
  res.writeHead(302, { Location: url.toString() });
  res.end();
}

module.exports = handler;
module.exports.handler = handler;
