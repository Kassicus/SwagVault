"use client";

import { useTransition } from "react";
import { toggleItemActive } from "@/app/admin/catalog/actions";

export function ItemActiveToggle({
  itemId,
  isActive,
}: {
  itemId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleItemActive(itemId, !isActive);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isActive ? "bg-success" : "bg-muted"
      } ${isPending ? "opacity-50" : ""}`}
      aria-label={isActive ? "Deactivate item" : "Activate item"}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
