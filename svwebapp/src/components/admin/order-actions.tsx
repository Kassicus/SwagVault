"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateOrderStatus } from "@/app/admin/orders/actions";

interface OrderActionsProps {
  orderId: string;
  status: string;
}

export function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleAction(newStatus: "approved" | "fulfilled" | "cancelled") {
    setError("");
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, newStatus);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Failed to update order");
      }
    });
  }

  if (status === "fulfilled" || status === "cancelled") {
    return null;
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        {status === "pending" && (
          <Button
            onClick={() => handleAction("approved")}
            loading={isPending}
          >
            Approve Order
          </Button>
        )}
        {status === "approved" && (
          <Button
            onClick={() => handleAction("fulfilled")}
            loading={isPending}
          >
            Mark as Fulfilled
          </Button>
        )}
        {(status === "pending" || status === "approved") && (
          <Button
            variant="destructive"
            onClick={() => handleAction("cancelled")}
            loading={isPending}
          >
            Cancel & Refund
          </Button>
        )}
      </div>
    </div>
  );
}
