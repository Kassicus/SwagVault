import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiRequest, type ApiAuthContext } from "./auth";
import { checkRateLimit } from "./rate-limit";
import { AppError } from "@/lib/errors";

interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

function addRateLimitHeaders(
  response: NextResponse,
  rateLimit: { limit: number; remaining: number; resetAt: number }
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimit.resetAt / 1000)));
  return response;
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = { data };
  if (meta) body.meta = meta;
  return NextResponse.json(body);
}

export function apiError(
  message: string,
  code: string = "INTERNAL_ERROR",
  status: number = 500
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: { code, message } },
    { status }
  );
}

export function apiPaginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): NextResponse<ApiSuccessResponse<T[]>> {
  return NextResponse.json({
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

type ApiHandlerFn = (
  req: NextRequest,
  ctx: ApiAuthContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

export function withApiHandler(handler: ApiHandlerFn) {
  return async (req: NextRequest, segmentData?: { params: Promise<Record<string, string>> }) => {
    try {
      const authCtx = await authenticateApiRequest(req);

      // Rate limiting
      const rateLimit = checkRateLimit(authCtx.apiKeyId);
      if (!rateLimit.allowed) {
        const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        const response = apiError(
          "Rate limit exceeded",
          "RATE_LIMIT_EXCEEDED",
          429
        );
        addRateLimitHeaders(response, rateLimit);
        response.headers.set("Retry-After", String(retryAfter));
        return response;
      }

      const params = segmentData ? await segmentData.params : undefined;
      const response = await handler(req, authCtx, params);
      addRateLimitHeaders(response, rateLimit);
      return response;
    } catch (err) {
      if (err instanceof AppError) {
        return apiError(err.message, err.code ?? "ERROR", err.statusCode);
      }
      console.error("API error:", err);
      return apiError("Internal server error", "INTERNAL_ERROR", 500);
    }
  };
}
