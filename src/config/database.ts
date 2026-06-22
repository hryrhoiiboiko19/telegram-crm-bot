import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Logger } from "../utils/logger/index.js";
import { env } from "./env.js";
import * as schema from "../database/schema.js";

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  Logger.error("DATABASE_URL is not defined in the environment variables!");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

pool.on("connect", () => {
  Logger.info("PostgreSQL connection pool established successfully");
});

pool.on("error", (error) => {
  Logger.error(["Unexpected error on idle PostgreSQL client", error]);
});

export const db = drizzle(pool, { schema });
