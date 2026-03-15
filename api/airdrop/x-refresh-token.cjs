/**
 * Refresh X OAuth 2.0 access token using refresh_token.
 * POST https://api.x.com/2/oauth2/token with grant_type=refresh_token.
 * @returns {Promise<{ accessToken: string, refreshToken: string } | null>}
 */
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";

async function refreshXToken(refreshToken) {
  if (!refreshToken || !refreshToken.trim()) return null;
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("x-refresh-token: refresh failed", res.status, errText);
    return null;
  }

  let data;
  try {
    data = await res.json();
  } catch (_) {
    return null;
  }

  const accessToken = data.access_token;
  const newRefreshToken = data.refresh_token ?? refreshToken;
  if (!accessToken) return null;
  return { accessToken, refreshToken: newRefreshToken };
}

module.exports = { refreshXToken };
