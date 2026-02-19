export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "SwagVault API",
    version: "1.0.0",
    description:
      "REST API for managing your SwagVault store programmatically. Requires an Enterprise plan and a valid API key.",
    contact: { name: "SwagVault Support", url: "https://getswagvault.com" },
  },
  servers: [{ url: "/api/v1", description: "API v1" }],
  security: [{ BearerAuth: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description:
          "API key in the format `sv_live_<hex>`. Pass via `Authorization: Bearer sv_live_...`",
      },
    },
    schemas: {
      Error: {
        type: "object" as const,
        properties: {
          error: {
            type: "object" as const,
            properties: {
              code: { type: "string" as const },
              message: { type: "string" as const },
            },
          },
        },
      },
      PaginationMeta: {
        type: "object" as const,
        properties: {
          page: { type: "integer" as const },
          pageSize: { type: "integer" as const },
          total: { type: "integer" as const },
          totalPages: { type: "integer" as const },
        },
      },
      Item: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          name: { type: "string" as const },
          slug: { type: "string" as const },
          description: { type: "string" as const, nullable: true },
          price: { type: "integer" as const },
          categoryId: { type: "string" as const, format: "uuid", nullable: true },
          categoryName: { type: "string" as const, nullable: true },
          imageUrls: { type: "array" as const, items: { type: "string" as const } },
          stockQuantity: { type: "integer" as const, nullable: true },
          isActive: { type: "boolean" as const },
          createdAt: { type: "string" as const, format: "date-time" },
        },
      },
      Member: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          userId: { type: "string" as const, format: "uuid" },
          email: { type: "string" as const },
          displayName: { type: "string" as const },
          role: { type: "string" as const, enum: ["owner", "admin", "manager", "member"] },
          isActive: { type: "boolean" as const },
          balance: { type: "integer" as const, nullable: true },
          joinedAt: { type: "string" as const, format: "date-time" },
        },
      },
      Order: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          orderNumber: { type: "integer" as const },
          userId: { type: "string" as const, format: "uuid" },
          userEmail: { type: "string" as const },
          status: { type: "string" as const, enum: ["pending", "approved", "fulfilled", "cancelled"] },
          totalCost: { type: "integer" as const },
          createdAt: { type: "string" as const, format: "date-time" },
        },
      },
      CurrencyResult: {
        type: "object" as const,
        properties: {
          newBalance: { type: "integer" as const },
          transactionId: { type: "string" as const, format: "uuid" },
        },
      },
      BulkDistributeResult: {
        type: "object" as const,
        properties: {
          count: { type: "integer" as const },
          totalDistributed: { type: "integer" as const },
        },
      },
      WebhookPayload: {
        type: "object" as const,
        properties: {
          event: { type: "string" as const },
          data: { type: "object" as const },
          timestamp: { type: "string" as const, format: "date-time" },
        },
        description:
          "Webhook payloads are signed with HMAC-SHA256. Verify by computing: `sha256=HMAC(secret, timestamp.body)` and comparing to the `X-SwagVault-Signature` header.",
      },
    },
    parameters: {
      page: { name: "page", in: "query" as const, schema: { type: "integer" as const, default: 1 } },
      pageSize: { name: "pageSize", in: "query" as const, schema: { type: "integer" as const, default: 20, maximum: 100 } },
    },
  },
  paths: {
    "/items": {
      get: {
        summary: "List items",
        operationId: "listItems",
        tags: ["Items"],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { name: "category", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by category ID" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name" },
        ],
        responses: {
          "200": { description: "Paginated list of items", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Item" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } } } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/items/{id}": {
      get: {
        summary: "Get item by ID",
        operationId: "getItem",
        tags: ["Items"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Item details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Item" } } } } } },
          "404": { description: "Not found" },
        },
      },
    },
    "/members": {
      get: {
        summary: "List members",
        operationId: "listMembers",
        tags: ["Members"],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
        ],
        responses: {
          "200": { description: "Paginated list of members", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Member" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } } } } },
        },
      },
    },
    "/members/{id}": {
      get: {
        summary: "Get member by ID",
        operationId: "getMember",
        tags: ["Members"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Member details", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/Member" } } } } } },
          "404": { description: "Not found" },
        },
      },
    },
    "/orders": {
      get: {
        summary: "List orders",
        operationId: "listOrders",
        tags: ["Orders"],
        parameters: [
          { $ref: "#/components/parameters/page" },
          { $ref: "#/components/parameters/pageSize" },
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "approved", "fulfilled", "cancelled"] } },
        ],
        responses: {
          "200": { description: "Paginated list of orders", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/Order" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } } } } },
        },
      },
    },
    "/orders/{id}": {
      get: {
        summary: "Get order by ID (with line items)",
        operationId: "getOrder",
        tags: ["Orders"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Order with line items" },
          "404": { description: "Not found" },
        },
      },
    },
    "/currency/credit": {
      post: {
        summary: "Credit a user's balance",
        operationId: "creditUser",
        tags: ["Currency"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "amount", "reason"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  amount: { type: "integer", minimum: 1 },
                  reason: { type: "string", maxLength: 255 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Credit applied", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/CurrencyResult" } } } } } },
          "403": { description: "Insufficient permissions" },
        },
      },
    },
    "/currency/debit": {
      post: {
        summary: "Debit a user's balance",
        operationId: "debitUser",
        tags: ["Currency"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "amount", "reason"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  amount: { type: "integer", minimum: 1 },
                  reason: { type: "string", maxLength: 255 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Debit applied", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/CurrencyResult" } } } } } },
          "400": { description: "Insufficient balance" },
        },
      },
    },
    "/currency/distribute": {
      post: {
        summary: "Distribute currency to multiple users",
        operationId: "distributeCurrency",
        tags: ["Currency"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userIds", "amount", "reason"],
                properties: {
                  userIds: { type: "array", items: { type: "string", format: "uuid" } },
                  amount: { type: "integer", minimum: 1 },
                  reason: { type: "string", maxLength: 255 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Distribution complete", content: { "application/json": { schema: { type: "object", properties: { data: { $ref: "#/components/schemas/BulkDistributeResult" } } } } } },
        },
      },
    },
  },
  "x-webhooks": {
    description:
      "Webhooks are sent as HTTP POST requests with a JSON body. Headers include: X-SwagVault-Signature (HMAC-SHA256), X-SwagVault-Event, X-SwagVault-Timestamp. To verify: compute sha256=HMAC(secret, timestamp.body) and compare.",
    events: [
      "order.created",
      "order.status_changed",
      "user.credited",
      "user.debited",
      "member.joined",
      "item.created",
      "item.updated",
    ],
  },
  "x-rate-limiting": {
    description:
      "100 requests per 60 seconds per API key. Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset. On 429, check Retry-After header.",
  },
};
