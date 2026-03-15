/**
 * Check which of our target X accounts the user follows. Allocation = 10 per account followed.
 * Uses Twitter API v2 GET /2/users/:id/following with the user's access token.
 */
const X_FOLLOWING_URL = "https://api.x.com/2/users";

const TARGET_USERNAMES = ["1000s_sol", "BUXDAO", "knucklebunnyds", "slottogg_"];
const ALLOCATION_PER_ACCOUNT = 10;
let xLimitLogged = false;

/**
 * @param {string} accessToken - User's X OAuth access token
 * @param {string} xUserId - User's X (Twitter) user ID
 * @returns {Promise<{ accounts: { username: string, followed: boolean }[], allocation: number }>}
 */
async function getXFollowedAccounts(accessToken, xUserId) {
  const accounts = TARGET_USERNAMES.map((u) => ({ username: "@" + u, followed: false }));
  const targetSet = new Set(TARGET_USERNAMES.map((u) => u.toLowerCase()));
  const found = new Set();
  let nextToken = null;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`${X_FOLLOWING_URL}/${xUserId}/following`);
    url.searchParams.set("max_results", "1000");
    url.searchParams.set("user.fields", "username"); // required to get username in response
    if (nextToken) url.searchParams.set("pagination_token", nextToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: "Bearer " + accessToken },
    });
    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401) {
        return { accounts, allocation: 0, tokenExpired: true };
      }
      const isLimit = res.status === 402 || res.status === 403;
      if (isLimit) {
        if (!xLimitLogged) {
          xLimitLogged = true;
          const detail = res.status === 402 ? "credits depleted" : "spend cap reached";
          console.warn("x-following: X API limit (" + res.status + ") — " + detail + ". Following check skipped. Add credits or raise spend cap in X Developer Portal.");
        }
      } else {
        console.error("x-following: API error", res.status, errText);
      }
      return { accounts, allocation: 0, creditsDepleted: isLimit };
    }
    const data = await res.json().catch(() => ({}));
    const list = data.data || [];
    if (page === 0 && list.length === 0 && !data.meta?.next_token) {
      console.warn("x-following: API returned 200 but no data (check user.fields or scope follows.read)");
    }
    for (const user of list) {
      const un = (user.username || user.user_name || "").toLowerCase();
      if (targetSet.has(un)) found.add(un);
    }
    nextToken = data.meta?.next_token || null;
    if (!nextToken || list.length < 1000) break;
  }

  for (let i = 0; i < TARGET_USERNAMES.length; i++) {
    accounts[i].followed = found.has(TARGET_USERNAMES[i].toLowerCase());
  }
  const allocation = found.size * ALLOCATION_PER_ACCOUNT;
  if (found.size > 0) {
    console.log("x-following: found", found.size, "of", TARGET_USERNAMES.length, "accounts followed:", [...found].join(", "));
  }
  return { accounts, allocation };
}

module.exports = { getXFollowedAccounts, TARGET_USERNAMES, ALLOCATION_PER_ACCOUNT };
