export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    res.status(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  res.status(200).end(JSON.stringify({ ok: true, routes: ["collections", "prices", "holders"] }));
}
