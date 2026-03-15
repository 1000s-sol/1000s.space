// Run migration SQL file against Neon. Usage: node database/run-migration.cjs [migration_file]
// Default: database/migration_001_discord_and_slots.sql
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const migrationFile = process.argv[2] || path.join(__dirname, "migration_001_discord_and_slots.sql");

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env");
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error("File not found:", migrationFile);
  process.exit(1);
}

function splitStatements(content) {
  const out = [];
  let current = "";
  let inDollar = false;
  for (const line of content.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    if (line.includes("$$")) inDollar = !inDollar;
    current += line + "\n";
    if (!inDollar && /;\s*$/.test(line.trim())) {
      const st = current.replace(/^\s*--.*$/gm, "").trim();
      if (st) out.push(st);
      current = "";
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

async function main() {
  const { neon } = require("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const body = fs.readFileSync(migrationFile, "utf8");
  const statements = splitStatements(body);
  console.log("Running", statements.length, "statements from", path.basename(migrationFile));
  // Neon serverless 1.x only accepts tagged-template calls: sql`...`. Simulate sql`${sql.unsafe(st)}`.
  const templateStrings = Object.assign([""], { raw: [""] });
  for (let i = 0; i < statements.length; i++) {
    const st = statements[i];
    try {
      await sql(templateStrings, sql.unsafe(st));
      console.log("  OK", i + 1);
    } catch (e) {
      console.error("  FAIL", i + 1, e.message);
      process.exit(1);
    }
  }
  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
