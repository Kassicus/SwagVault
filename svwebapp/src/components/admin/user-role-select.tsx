"use client";

import { useTransition } from "react";
import { updateMemberRole } from "@/app/admin/users/actions";

interface UserRoleSelectProps {
  memberId: string;
  currentRole: string;
}

export function UserRoleSelect({ memberId, currentRole }: UserRoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    startTransition(async () => {
      await updateMemberRole(
        memberId,
        e.target.value as "admin" | "manager" | "member"
      );
    });
  }

  if (currentRole === "owner") {
    return <p className="mt-1 text-sm font-medium">Owner</p>;
  }

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      disabled={isPending}
      className="mt-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
    >
      <option value="admin">Admin</option>
      <option value="manager">Manager</option>
      <option value="member">Member</option>
    </select>
  );
}
