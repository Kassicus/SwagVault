import type { WebhookEvent } from "./events";

interface EventPayloadExample {
  event: WebhookEvent;
  label: string;
  description: string;
  examplePayload: Record<string, unknown>;
}

export const WEBHOOK_PAYLOAD_EXAMPLES: EventPayloadExample[] = [
  {
    event: "order.created",
    label: "Order Created",
    description: "Fired when a member places a new order in the store.",
    examplePayload: {
      event: "order.created",
      data: {
        orderId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        orderNumber: 42,
        userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        totalCost: 150,
      },
      timestamp: "2026-02-19T12:00:00.000Z",
    },
  },
  {
    event: "order.status_changed",
    label: "Order Status Changed",
    description: "Fired when an admin updates the status of an order (approved, fulfilled, or cancelled).",
    examplePayload: {
      event: "order.status_changed",
      data: {
        orderId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        newStatus: "fulfilled",
      },
      timestamp: "2026-02-19T12:30:00.000Z",
    },
  },
  {
    event: "user.credited",
    label: "User Credited",
    description: "Fired when currency is credited to a user (admin distribution or API).",
    examplePayload: {
      event: "user.credited",
      data: {
        userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        amount: 100,
        reason: "Monthly distribution",
      },
      timestamp: "2026-02-19T09:00:00.000Z",
    },
  },
  {
    event: "user.debited",
    label: "User Debited",
    description: "Fired when currency is debited from a user (order placement or API).",
    examplePayload: {
      event: "user.debited",
      data: {
        userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        amount: 50,
        reason: "Order #42",
      },
      timestamp: "2026-02-19T12:00:00.000Z",
    },
  },
  {
    event: "member.joined",
    label: "Member Joined",
    description: "Fired when a new member is invited to the organization.",
    examplePayload: {
      event: "member.joined",
      data: {
        userId: "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
        email: "newmember@example.com",
        role: "member",
      },
      timestamp: "2026-02-19T10:00:00.000Z",
    },
  },
  {
    event: "item.created",
    label: "Item Created",
    description: "Fired when a new item is added to the catalog.",
    examplePayload: {
      event: "item.created",
      data: {
        itemId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        slug: "company-hoodie",
      },
      timestamp: "2026-02-19T08:00:00.000Z",
    },
  },
  {
    event: "item.updated",
    label: "Item Updated",
    description: "Fired when an existing catalog item is modified.",
    examplePayload: {
      event: "item.updated",
      data: {
        itemId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      },
      timestamp: "2026-02-19T08:30:00.000Z",
    },
  },
];

export const ZAPIER_SETUP_STEPS = [
  "Create a new Zap in Zapier and choose **Webhooks by Zapier** as the trigger.",
  'Select **Catch Hook** as the trigger event and copy the webhook URL Zapier gives you.',
  "In SwagVault, go to **Settings > Webhooks** and create a new endpoint with the Zapier URL.",
  "Select the events you want to receive and save. Copy the webhook secret.",
  "Back in Zapier, trigger a test event from SwagVault (e.g., create an item) so Zapier can detect the payload shape.",
  "Add your desired action step (e.g., send an email, post to a Google Sheet, create a Jira ticket).",
  "Use the webhook payload fields to map data into your action.",
];

export const N8N_SETUP_STEPS = [
  "Create a new workflow in n8n and add a **Webhook** trigger node.",
  'Set the HTTP Method to **POST** and copy the production webhook URL.',
  "In SwagVault, go to **Settings > Webhooks** and create a new endpoint with the n8n URL.",
  "Select the events you want and save. Copy the webhook secret for signature verification.",
  'In n8n, add a **Code** node after the Webhook to verify the signature (see verification snippet below).',
  "Add your desired action nodes (e.g., Slack, email, database, HTTP request).",
  'Use the `$json.data` fields from the webhook payload to populate your action nodes.',
];

export const SIGNATURE_VERIFICATION_SNIPPET = `// Node.js signature verification
const crypto = require('crypto');

function verifyWebhookSignature(body, secret, signature, timestamp) {
  const signedContent = \`\${timestamp}.\${body}\`;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(signedContent)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Usage in your handler:
// const signature = headers['x-swagvault-signature'];
// const timestamp = headers['x-swagvault-timestamp'];
// const isValid = verifyWebhookSignature(rawBody, secret, signature, timestamp);`;

export const N8N_VERIFICATION_SNIPPET = `// n8n Code Node — signature verification
const crypto = require('crypto');

const body = JSON.stringify($input.first().json);
const secret = 'whsec_your_secret_here';
const signature = $input.first().headers['x-swagvault-signature'];
const timestamp = $input.first().headers['x-swagvault-timestamp'];

const signedContent = \`\${timestamp}.\${body}\`;
const expected = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(signedContent)
  .digest('hex');

if (signature !== expected) {
  throw new Error('Invalid webhook signature');
}

return $input.all();`;
