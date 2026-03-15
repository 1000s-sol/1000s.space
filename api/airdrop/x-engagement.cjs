/**
 * X engagement: liked, reposted, and mentioned tweets from our accounts (last 24h).
 * Each engagement = 10 allocation. Uses like.read and tweet.read.
 */
const X_API_BASE = "https://api.x.com/2";
const { TARGET_USERNAMES } = require("./x-following.cjs");

const TARGET_USERNAMES_LOWER = new Set(TARGET_USERNAMES.map((u) => u.toLowerCase()));
const MENTION_PATTERNS = TARGET_USERNAMES.map((u) => "@" + u.toLowerCase());
const POINTS_PER_ENGAGEMENT = 10;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let engagementLimitLogged = false;
let targetUserIdsCache = null;

async function getTargetUserIds(accessToken) {
  if (targetUserIdsCache) return targetUserIdsCache;
  const ids = new Set();
  for (const username of TARGET_USERNAMES) {
    try {
      const res = await fetch(`${X_API_BASE}/users/by/username/${encodeURIComponent(username)}`, {
        headers: { Authorization: "Bearer " + accessToken },
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      if (data.data?.id) ids.add(data.data.id);
    } catch (_) {}
  }
  targetUserIdsCache = ids;
  return ids;
}

/**
 * Liked tweets from our accounts (24h).
 */
async function getLikedCount(accessToken, xUserId, cutoffTime) {
  let count = 0;
  let nextToken = null;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${X_API_BASE}/users/${xUserId}/liked_tweets`);
    url.searchParams.set("max_results", "100");
    url.searchParams.set("tweet.fields", "created_at,author_id");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username");
    if (nextToken) url.searchParams.set("pagination_token", nextToken);

    const res = await fetch(url.toString(), { headers: { Authorization: "Bearer " + accessToken } });
    if (!res.ok) return { count: 0, tokenExpired: res.status === 401, creditsDepleted: res.status === 402 || res.status === 403 };
    const data = await res.json().catch(() => ({}));
    const list = data.data || [];
    const users = (data.includes && data.includes.users) || [];
    const authorById = new Map();
    for (const u of users) authorById.set(u.id, (u.username || "").toLowerCase());

    for (const t of list) {
      if (t.created_at && new Date(t.created_at).getTime() < cutoffTime) continue;
      if (TARGET_USERNAMES_LOWER.has(authorById.get(t.author_id) || "")) count++;
    }
    nextToken = data.meta?.next_token || null;
    if (!nextToken || list.length < 100) break;
  }
  return { count };
}

/**
 * User timeline: count reposts (retweets of our accounts) and mentions (tweets mentioning our handles) in 24h.
 * Uses expansion to get referenced tweet author (by id or by username) so we match our accounts.
 */
async function getRepostedAndMentionedCount(accessToken, xUserId, targetUserIds, cutoffTime) {
  console.warn("x-engagement: getRepostedAndMentionedCount called");
  let repostedCount = 0;
  let mentionedCount = 0;
  let nextToken = null;
  let totalIn24h = 0;
  let totalWithRtOrQuoted = 0;
  let totalRefById = 0;
  for (let page = 0; page < 20; page++) {
    const url = new URL(`${X_API_BASE}/users/${xUserId}/tweets`);
    url.searchParams.set("max_results", "100");
    url.searchParams.set("exclude", "replies"); // include retweets (only exclude replies)
    url.searchParams.set("tweet.fields", "created_at,referenced_tweets,text,author_id");
    url.searchParams.set("expansions", "referenced_tweets.id,referenced_tweets.id.author_id");
    url.searchParams.set("user.fields", "username");
    if (nextToken) url.searchParams.set("pagination_token", nextToken);

    const res = await fetch(url.toString(), { headers: { Authorization: "Bearer " + accessToken } });
    if (page === 0) {
      console.warn("x-engagement: timeline status=" + res.status + " ok=" + res.ok);
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn("x-engagement: timeline 400 body=" + (errBody.slice(0, 500) || res.statusText));
      }
    }
    if (!res.ok) return { repostedCount: 0, mentionedCount: 0, repostUnavailable: false, tokenExpired: res.status === 401, creditsDepleted: res.status === 402 || res.status === 403 };
    const data = await res.json().catch(() => ({}));
    const list = data.data || [];
    const refTweets = (data.includes && data.includes.tweets) || [];
    const refUsers = (data.includes && data.includes.users) || [];
    const refById = new Map();
    for (const rt of refTweets) refById.set(rt.id, rt);
    const authorIdToUsername = new Map();
    for (const u of refUsers) authorIdToUsername.set(u.id, (u.username || "").toLowerCase());

    if (page === 0) {
      const sample = list.length === 0 ? [] : list.slice(0, 15).map((t) => (t.referenced_tweets || []).map((r) => r.type).join(",") || "original");
      console.warn("x-engagement: timeline res ok=" + res.ok + " tweets=" + list.length + " ref_types=" + (sample.length ? "[" + sample.join("|") + "]" : "[]"));
    }

    for (const t of list) {
      const createdAt = t.created_at ? new Date(t.created_at).getTime() : 0;
      if (createdAt < cutoffTime) continue;
      totalIn24h++;
      const refs = t.referenced_tweets || [];
      const retweeted = refs.find((r) => r.type === "retweeted");
      const quoted = refs.find((r) => r.type === "quoted");
      const repostRef = retweeted || quoted;
      if (repostRef) {
        totalWithRtOrQuoted++;
        totalRefById = refById.size;
        const orig = refById.get(repostRef.id);
        if (orig) {
          const authorId = orig.author_id;
          const authorUsername = authorId ? authorIdToUsername.get(authorId) : null;
          const matchById = authorId && targetUserIds.has(authorId);
          const matchByUsername = authorUsername && TARGET_USERNAMES_LOWER.has(authorUsername);
          if (matchById || matchByUsername) repostedCount++;
        }
      } else {
        const text = (t.text || "").toLowerCase();
        if (MENTION_PATTERNS.some((p) => text.includes(p))) mentionedCount++;
      }
    }
    nextToken = data.meta?.next_token || null;
    if (!nextToken || list.length < 100) break;
  }
  const repostUnavailable = repostedCount === 0 && totalWithRtOrQuoted === 0 && totalIn24h > 0;
  if (repostUnavailable) {
    console.warn("x-engagement: timeline has " + totalIn24h + " tweets in 24h but 0 retweets in response; X API may not return retweets for this app tier.");
  }
  return { repostedCount, mentionedCount, repostUnavailable };
}

/**
 * @returns {Promise<{ likedCount: number, repostedCount: number, mentionedCount: number, allocation: number, repostUnavailable?: boolean, tokenExpired?: boolean, creditsDepleted?: boolean }>}
 */
async function getXEngagement(accessToken, xUserId) {
  const cutoffTime = Date.now() - TWENTY_FOUR_HOURS_MS;

  const likedRes = await getLikedCount(accessToken, xUserId, cutoffTime);
  if (likedRes.tokenExpired) return { likedCount: 0, repostedCount: 0, mentionedCount: 0, allocation: 0, tokenExpired: true };
  if (likedRes.creditsDepleted) {
    if (!engagementLimitLogged) {
      engagementLimitLogged = true;
      console.warn("x-engagement: X API limit (402/403). Engagement check skipped.");
    }
    return { likedCount: 0, repostedCount: 0, mentionedCount: 0, allocation: 0, creditsDepleted: true };
  }

  const targetUserIds = await getTargetUserIds(accessToken);
  if (targetUserIds.size === 0) {
    console.warn("x-engagement: could not resolve our account IDs (users/by/username); repost count may be 0.");
  }
  const repostMentionRes = await getRepostedAndMentionedCount(accessToken, xUserId, targetUserIds, cutoffTime);
  if (repostMentionRes.tokenExpired) return { likedCount: likedRes.count, repostedCount: 0, mentionedCount: 0, allocation: likedRes.count * POINTS_PER_ENGAGEMENT, tokenExpired: true };
  if (repostMentionRes.creditsDepleted) return { likedCount: likedRes.count, repostedCount: 0, mentionedCount: 0, allocation: likedRes.count * POINTS_PER_ENGAGEMENT, creditsDepleted: true };

  const likedCount = likedRes.count;
  const repostedCount = repostMentionRes.repostedCount;
  const mentionedCount = repostMentionRes.mentionedCount;
  const repostUnavailable = repostMentionRes.repostUnavailable === true;
  const allocation = (likedCount + repostedCount + mentionedCount) * POINTS_PER_ENGAGEMENT;

  if (likedCount + repostedCount + mentionedCount > 0) {
    console.log("x-engagement: liked", likedCount, "reposted", repostedCount, "mentioned", mentionedCount, "(24h), +" + allocation, "allocation");
  }
  return { likedCount, repostedCount, mentionedCount, allocation, repostUnavailable };
}

module.exports = { getXEngagement };
