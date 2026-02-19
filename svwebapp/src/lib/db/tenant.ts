import { sql } from "drizzle-orm";
import { db, type Database } from "./index";

type TransactionClient = Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function withTenant<T>(
  tenantId: string,
  fn: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`);
    return fn(tx);
  });
}
