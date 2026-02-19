import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString, {
    prepare: false, // Required for Supabase connection pooler (PgBouncer)
  });

  return drizzle(client, {
    schema: { ...schema, ...relations },
  });
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) {
      _db = createDb();
    }
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Database = ReturnType<typeof createDb>;
