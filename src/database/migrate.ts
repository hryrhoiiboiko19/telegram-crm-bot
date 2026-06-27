import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { Logger } from "../utils/logger/index.js";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function runMigrations() {
  Logger.info("Running database migrations...");

  await migrate(db, { migrationsFolder: "./dist/database/migrations" });

  Logger.info("Database migrations completed successfully!");

  await pool.end();
}

runMigrations().catch((error) => {
  Logger.error(["Migration failed", error as Error]);
  pool.end();
  process.exit(1);
});