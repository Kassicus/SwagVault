export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance: requires ${required}, available ${available}`,
      400,
      "INSUFFICIENT_BALANCE"
    );
    this.name = "InsufficientBalanceError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed") {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class TenantNotFoundError extends AppError {
  constructor(slug: string) {
    super(`Organization not found: ${slug}`, 404, "TENANT_NOT_FOUND");
    this.name = "TenantNotFoundError";
  }
}

export class OutOfStockError extends AppError {
  constructor(itemName: string) {
    super(`${itemName} is out of stock`, 400, "OUT_OF_STOCK");
    this.name = "OutOfStockError";
  }
}
