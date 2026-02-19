import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

interface AuditEvent {
  tenantId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export function logAuditEvent(event: AuditEvent) {
  // Fire-and-forget insert
  db.insert(auditLogs)
    .values({
      tenantId: event.tenantId,
      userId: event.userId ?? null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      metadata: event.metadata ?? null,
      ipAddress: event.ipAddress ?? null,
    })
    .catch((err) => {
      console.error("Audit log insert failed:", err);
    });
}
