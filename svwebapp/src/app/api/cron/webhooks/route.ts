import { NextResponse, type NextRequest } from "next/server";
import { processWebhookRetries } from "@/lib/webhooks/retry";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processWebhookRetries();
  return NextResponse.json(result);
}
