import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { getHolders } = require("./_lib.cjs");

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.status(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  const group = (req.query?.group || "KBDS").toUpperCase();
  try {
    const data = await getHolders(group);
    res.status(200).end(JSON.stringify(data));
  } catch (e) {
    console.error(e);
    res.status(500).end(JSON.stringify({ error: "Failed to fetch holders" }));
  }
}
