import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Logger } from "../utils/logger/index.js";
import { env } from "./env.js";
import * as schema from "../database/schema.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on("connect", () => {
  Logger.info("PostgreSQL connection pool established successfully");
});

pool.on("error", (error) => {
  Logger.error(["Unexpected error on idle PostgreSQL client", error]);
});

export const db = drizzle(pool, { schema });
