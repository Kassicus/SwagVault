import { relations } from "drizzle-orm";
import {
  organizations,
  users,
  organizationMembers,
  balances,
  items,
  categories,
  orders,
  orderItems,
  transactions,
  apiKeys,
  webhookEndpoints,
} from "./schema";

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  balances: many(balances),
  items: many(items),
  categories: many(categories),
  orders: many(orders),
  transactions: many(transactions),
  apiKeys: many(apiKeys),
  webhookEndpoints: many(webhookEndpoints),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  balances: many(balances),
  orders: many(orders),
  transactions: many(transactions),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.tenantId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMembers.userId],
      references: [users.id],
    }),
  })
);

export const balancesRelations = relations(balances, ({ one }) => ({
  organization: one(organizations, {
    fields: [balances.tenantId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [balances.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.tenantId],
    references: [organizations.id],
  }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  organization: one(organizations, {
    fields: [items.tenantId],
    references: [organizations.id],
  }),
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [orders.tenantId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [orderItems.tenantId],
    references: [organizations.id],
  }),
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  item: one(items, {
    fields: [orderItems.itemId],
    references: [items.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [transactions.tenantId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  performedByUser: one(users, {
    fields: [transactions.performedBy],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.tenantId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

export const webhookEndpointsRelations = relations(
  webhookEndpoints,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [webhookEndpoints.tenantId],
      references: [organizations.id],
    }),
  })
);
