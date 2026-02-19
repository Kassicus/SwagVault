"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { distributeCurrency } from "../actions";

interface MemberOption {
  id: string;
  displayName: string;
  email: string;
}

export default function DistributePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => setMembers(data.members ?? []))
      .catch(() => {});
  }, []);

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(members.map((m) => m.id));
    }
    setSelectAll(!selectAll);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    formData.set("userIds", JSON.stringify(selectedUserIds));

    startTransition(async () => {
      const result = await distributeCurrency(formData);
      if (result.success) {
        setSuccess(true);
        setSelectedUserIds([]);
        setSelectAll(false);
      } else {
        setError(result.error ?? "Distribution failed");
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Distribute Currency</h1>

      <Card>
        <CardHeader>
          <CardTitle>Send Credits</CardTitle>
          <CardDescription>
            Select users and specify the amount to distribute
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-success/10 p-3 text-sm text-success">
                Currency distributed successfully!
              </div>
            )}

            {/* User selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">Select Users</label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-input p-2">
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                <hr className="my-1 border-border" />
                {members.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(m.id)}
                      onChange={() => toggleUser(m.id)}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {m.displayName}{" "}
                      <span className="text-muted-foreground">
                        ({m.email})
                      </span>
                    </span>
                  </label>
                ))}
                {members.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    Loading members...
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedUserIds.length} user(s) selected
              </p>
            </div>

            <Input
              id="amount"
              name="amount"
              label="Amount per User"
              type="number"
              min={1}
              placeholder="100"
              required
            />

            <Input
              id="reason"
              name="reason"
              label="Reason"
              placeholder="Monthly reward"
              defaultValue="Admin distribution"
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                loading={isPending}
                disabled={selectedUserIds.length === 0}
              >
                Distribute
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/currency")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
