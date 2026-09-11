import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const directory = resolve(process.cwd(), "migrations");
    const migrations = (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const name of migrations) {
      const applied = await pool.query<{ exists: boolean }>(
        "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = $1) AS exists",
        [name],
      );
      if (applied.rows[0]?.exists) continue;

      const sql = await readFile(resolve(directory, name), "utf8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [
          name,
        ]);
        await client.query("COMMIT");
        console.info(`Applied migration ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

void main();
