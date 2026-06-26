import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, orders } from "../database/schema.js";
import { Logger } from "../utils/logger/index.js";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function seed() {
  Logger.info("Starting database seeding...");

  await db.delete(orders);
  await db.delete(users);

  const [alice] = await db
    .insert(users)
    .values({
      telegramId: "100000001",
      username: "alice_customer",
      firstName: "Alice",
      languageCode: "en",
      phone: "+380501112233",
    })
    .returning();

  const [bob] = await db
    .insert(users)
    .values({
      telegramId: "100000002",
      username: "bob_client",
      firstName: "Bob",
      languageCode: "uk",
      phone: "+380674445566",
    })
    .returning();

  const [carol] = await db
    .insert(users)
    .values({
      telegramId: "100000003",
      username: "carol_buyer",
      firstName: "Carol",
      languageCode: "en",
      phone: "+380971234567",
    })
    .returning();

  Logger.info(`Inserted ${3} users`);

  const orderData = [
    {
      userId: alice.id,
      serviceType: "Oil Change",
      description: "Engine oil replacement for sedan",
      status: "pending" as const,
    },
    {
      userId: alice.id,
      serviceType: "Tire Rotation",
      description: "Front-to-rear tire swap",
      status: "confirmed" as const,
    },
    {
      userId: bob.id,
      serviceType: "Battery Replacement",
      description: "Dead battery, need a new one installed",
      status: "completed" as const,
    },
    {
      userId: bob.id,
      serviceType: "Brake Pads",
      description: "Squeaking brakes, pads likely worn out",
      status: "cancelled" as const,
    },
    {
      userId: carol.id,
      serviceType: "Oil Change",
      description: "Routine maintenance",
      status: "completed" as const,
    },
    {
      userId: carol.id,
      serviceType: "Engine Diagnostic",
      description: "Check engine light is on",
      status: "pending" as const,
    },
    {
      userId: carol.id,
      serviceType: "Brake Pads",
      description: "Brake pedal feels soft",
      status: "confirmed" as const,
    },
  ];

  await db.insert(orders).values(orderData);

  Logger.info(`Inserted ${orderData.length} orders`);
  Logger.info("Database seeding completed successfully!");

  await pool.end();
}

seed().catch((error) => {
  Logger.error(["Seeding failed", error as Error]);
  pool.end();
  process.exit(1);
});