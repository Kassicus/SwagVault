import { eq, and, sql } from "drizzle-orm";
import { withTenant } from "../db/tenant";
import { balances, transactions } from "../db/schema";
import { InsufficientBalanceError } from "../errors";

interface CurrencyResult {
  newBalance: number;
  transactionId: string;
}

export async function creditUser(
  tenantId: string,
  userId: string,
  amount: number,
  reason: string,
  performedBy: string,
  reference?: { type: string; id: string }
): Promise<CurrencyResult> {
  return withTenant(tenantId, async (tx) => {
    // Update balance
    const [updated] = await tx
      .update(balances)
      .set({
        balance: sql`${balances.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(balances.tenantId, tenantId), eq(balances.userId, userId)))
      .returning({ balance: balances.balance });

    if (!updated) {
      // Create balance record if it doesn't exist
      const [created] = await tx
        .insert(balances)
        .values({ tenantId, userId, balance: amount })
        .returning({ balance: balances.balance });

      const [txn] = await tx
        .insert(transactions)
        .values({
          tenantId,
          userId,
          type: "credit",
          amount,
          balanceAfter: created.balance,
          reason,
          referenceType: reference?.type,
          referenceId: reference?.id,
          performedBy,
        })
        .returning({ id: transactions.id });

      return { newBalance: created.balance, transactionId: txn.id };
    }

    // Insert transaction record
    const [txn] = await tx
      .insert(transactions)
      .values({
        tenantId,
        userId,
        type: "credit",
        amount,
        balanceAfter: updated.balance,
        reason,
        referenceType: reference?.type,
        referenceId: reference?.id,
        performedBy,
      })
      .returning({ id: transactions.id });

    return { newBalance: updated.balance, transactionId: txn.id };
  });
}

export async function debitUser(
  tenantId: string,
  userId: string,
  amount: number,
  reason: string,
  performedBy: string,
  reference?: { type: string; id: string }
): Promise<CurrencyResult> {
  return withTenant(tenantId, async (tx) => {
    // Lock the balance row for update
    const [current] = await tx
      .select({ balance: balances.balance })
      .from(balances)
      .where(and(eq(balances.tenantId, tenantId), eq(balances.userId, userId)))
      .for("update");

    if (!current) {
      throw new InsufficientBalanceError(amount, 0);
    }

    if (current.balance < amount) {
      throw new InsufficientBalanceError(amount, current.balance);
    }

    const newBalance = current.balance - amount;

    await tx
      .update(balances)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(and(eq(balances.tenantId, tenantId), eq(balances.userId, userId)));

    const [txn] = await tx
      .insert(transactions)
      .values({
        tenantId,
        userId,
        type: "debit",
        amount,
        balanceAfter: newBalance,
        reason,
        referenceType: reference?.type,
        referenceId: reference?.id,
        performedBy,
      })
      .returning({ id: transactions.id });

    return { newBalance, transactionId: txn.id };
  });
}

export async function bulkDistribute(
  tenantId: string,
  userIds: string[],
  amount: number,
  reason: string,
  performedBy: string
): Promise<{ count: number; totalDistributed: number }> {
  return withTenant(tenantId, async (tx) => {
    let count = 0;

    for (const userId of userIds) {
      // Update or create balance
      const [existing] = await tx
        .select({ balance: balances.balance })
        .from(balances)
        .where(
          and(eq(balances.tenantId, tenantId), eq(balances.userId, userId))
        );

      let newBalance: number;

      if (existing) {
        newBalance = existing.balance + amount;
        await tx
          .update(balances)
          .set({ balance: newBalance, updatedAt: new Date() })
          .where(
            and(eq(balances.tenantId, tenantId), eq(balances.userId, userId))
          );
      } else {
        newBalance = amount;
        await tx.insert(balances).values({ tenantId, userId, balance: amount });
      }

      await tx.insert(transactions).values({
        tenantId,
        userId,
        type: "credit",
        amount,
        balanceAfter: newBalance,
        reason,
        performedBy,
        referenceType: "distribution",
      });

      count++;
    }

    return { count, totalDistributed: count * amount };
  });
}
