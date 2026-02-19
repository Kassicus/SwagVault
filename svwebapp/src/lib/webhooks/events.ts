export const WEBHOOK_EVENTS = {
  ORDER_CREATED: "order.created",
  ORDER_STATUS_CHANGED: "order.status_changed",
  USER_CREDITED: "user.credited",
  USER_DEBITED: "user.debited",
  MEMBER_JOINED: "member.joined",
  ITEM_CREATED: "item.created",
  ITEM_UPDATED: "item.updated",
} as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const ALL_WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "order.created", label: "Order Created" },
  { value: "order.status_changed", label: "Order Status Changed" },
  { value: "user.credited", label: "User Credited" },
  { value: "user.debited", label: "User Debited" },
  { value: "member.joined", label: "Member Joined" },
  { value: "item.created", label: "Item Created" },
  { value: "item.updated", label: "Item Updated" },
];
