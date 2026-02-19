"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import type { Item, Category } from "@/lib/db/schema";

interface ItemFormProps {
  item?: Item;
  categories: Category[];
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

export function ItemForm({ item, categories, action }: ItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        router.push("/admin/catalog");
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Input
        id="name"
        name="name"
        label="Item Name"
        placeholder="SwagVault T-Shirt"
        defaultValue={item?.name}
        required
      />

      <Textarea
        id="description"
        name="description"
        label="Description"
        placeholder="Describe this item..."
        defaultValue={item?.description ?? ""}
        rows={4}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="price"
          name="price"
          label="Price"
          type="number"
          min={0}
          placeholder="100"
          defaultValue={item?.price}
          required
        />
        <Input
          id="stockQuantity"
          name="stockQuantity"
          label="Stock Quantity"
          type="number"
          min={0}
          placeholder="Leave empty for unlimited"
          defaultValue={item?.stockQuantity ?? ""}
        />
      </div>

      {categories.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="categoryId" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={item?.categoryId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <input
        type="hidden"
        name="imageUrls"
        value={JSON.stringify(item?.imageUrls ?? [])}
      />

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          {item ? "Update Item" : "Create Item"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
