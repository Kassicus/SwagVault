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
  webhookDeliveries,
  auditLogs,
  integrations,
  itemOptionGroups,
  itemOptionValues,
  itemVariants,
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
  webhookDeliveries: many(webhookDeliveries),
  auditLogs: many(auditLogs),
  integrations: many(integrations),
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

export const itemsRelations = relations(items, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [items.tenantId],
    references: [organizations.id],
  }),
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
  optionGroups: many(itemOptionGroups),
  variants: many(itemVariants),
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

export const itemOptionGroupsRelations = relations(
  itemOptionGroups,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [itemOptionGroups.tenantId],
      references: [organizations.id],
    }),
    item: one(items, {
      fields: [itemOptionGroups.itemId],
      references: [items.id],
    }),
    values: many(itemOptionValues),
  })
);

export const itemOptionValuesRelations = relations(
  itemOptionValues,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [itemOptionValues.tenantId],
      references: [organizations.id],
    }),
    optionGroup: one(itemOptionGroups, {
      fields: [itemOptionValues.optionGroupId],
      references: [itemOptionGroups.id],
    }),
  })
);

export const itemVariantsRelations = relations(itemVariants, ({ one }) => ({
  organization: one(organizations, {
    fields: [itemVariants.tenantId],
    references: [organizations.id],
  }),
  item: one(items, {
    fields: [itemVariants.itemId],
    references: [items.id],
  }),
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
  variant: one(itemVariants, {
    fields: [orderItems.variantId],
    references: [itemVariants.id],
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
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [webhookEndpoints.tenantId],
      references: [organizations.id],
    }),
    deliveries: many(webhookDeliveries),
  })
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [webhookDeliveries.tenantId],
      references: [organizations.id],
    }),
    endpoint: one(webhookEndpoints, {
      fields: [webhookDeliveries.endpointId],
      references: [webhookEndpoints.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.tenantId],
    references: [organizations.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.tenantId],
    references: [organizations.id],
  }),
}));
