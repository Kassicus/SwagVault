"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, type ExistingImage } from "@/components/admin/image-upload";
import type { Item, Category } from "@/lib/db/schema";

// ─── Types for option groups / variants ─────────────────────────

export interface OptionGroupData {
  name: string;
  values: string[];
}

export interface VariantData {
  options: Record<string, string>;
  stockQuantity: number | null;
  priceOverride: number | null;
}

interface ItemFormProps {
  item?: Item;
  categories: Category[];
  existingImages?: ExistingImage[];
  initialOptionGroups?: OptionGroupData[];
  initialVariants?: VariantData[];
  action: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────

function generateCombinations(groups: OptionGroupData[]): Record<string, string>[] {
  if (groups.length === 0) return [];
  const filtered = groups.filter((g) => g.values.length > 0);
  if (filtered.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const group of filtered) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const val of group.values) {
        next.push({ ...combo, [group.name]: val });
      }
    }
    combos = next;
  }
  return combos;
}

function optionsKey(opts: Record<string, string>) {
  return Object.entries(opts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

// ─── Component ──────────────────────────────────────────────────

export function ItemForm({
  item,
  categories,
  existingImages,
  initialOptionGroups,
  initialVariants,
  action,
}: ItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const pendingFilesRef = useRef<File[]>([]);
  const existingPathsRef = useRef<string[]>(existingImages?.map((img) => img.path) ?? []);

  // Option groups state
  const [optionGroups, setOptionGroups] = useState<OptionGroupData[]>(
    initialOptionGroups ?? []
  );

  // Variant stock/price keyed by optionsKey
  const [variantMap, setVariantMap] = useState<
    Record<string, { stockQuantity: number | null; priceOverride: number | null }>
  >(() => {
    const map: Record<string, { stockQuantity: number | null; priceOverride: number | null }> = {};
    if (initialVariants) {
      for (const v of initialVariants) {
        map[optionsKey(v.options)] = {
          stockQuantity: v.stockQuantity,
          priceOverride: v.priceOverride,
        };
      }
    }
    return map;
  });

  const hasOptions = optionGroups.length > 0 && optionGroups.some((g) => g.values.length > 0);
  const combinations = generateCombinations(optionGroups);

  function handleImageChange(pendingFiles: File[], existingPaths: string[]) {
    pendingFilesRef.current = pendingFiles;
    existingPathsRef.current = existingPaths;
  }

  // ─── Option Group Management ──────────────────────────────────

  function addOptionGroup() {
    setOptionGroups((prev) => [...prev, { name: "", values: [] }]);
  }

  function removeOptionGroup(idx: number) {
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateGroupName(idx: number, name: string) {
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, name } : g))
    );
  }

  function addValueToGroup(idx: number, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === idx && !g.values.includes(trimmed)
          ? { ...g, values: [...g.values, trimmed] }
          : g
      )
    );
  }

  function removeValueFromGroup(groupIdx: number, valueIdx: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, values: g.values.filter((_, vi) => vi !== valueIdx) }
          : g
      )
    );
  }

  // ─── Variant Matrix ───────────────────────────────────────────

  function getVariantData(opts: Record<string, string>) {
    const key = optionsKey(opts);
    return variantMap[key] ?? { stockQuantity: null, priceOverride: null };
  }

  function setVariantField(
    opts: Record<string, string>,
    field: "stockQuantity" | "priceOverride",
    value: number | null
  ) {
    const key = optionsKey(opts);
    setVariantMap((prev) => ({
      ...prev,
      [key]: { ...getVariantData(opts), [field]: value },
    }));
  }

  function setAllStock(value: number | null) {
    setVariantMap((prev) => {
      const next = { ...prev };
      for (const combo of combinations) {
        const key = optionsKey(combo);
        next[key] = { ...(next[key] ?? { stockQuantity: null, priceOverride: null }), stockQuantity: value };
      }
      return next;
    });
  }

  // ─── Submit ───────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);

    // Append image data
    for (const file of pendingFilesRef.current) {
      formData.append("newImages", file);
    }
    formData.set("existingImagePaths", JSON.stringify(existingPathsRef.current));

    // Append option groups + variants as JSON
    if (hasOptions) {
      const validGroups = optionGroups.filter((g) => g.name.trim() && g.values.length > 0);
      formData.set("optionGroups", JSON.stringify(validGroups));

      const variants = combinations.map((combo) => ({
        options: combo,
        ...getVariantData(combo),
      }));
      formData.set("variants", JSON.stringify(variants));

      // Clear stockQuantity from the main form since stock is per-variant
      formData.delete("stockQuantity");
    }

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
        {!hasOptions && (
          <Input
            id="stockQuantity"
            name="stockQuantity"
            label="Stock Quantity"
            type="number"
            min={0}
            placeholder="Leave empty for unlimited"
            defaultValue={item?.stockQuantity ?? ""}
          />
        )}
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

      <ImageUpload
        existingImages={existingImages}
        onChange={handleImageChange}
      />

      {/* ─── Item Options Section ──────────────────────────────── */}
      <div className="space-y-4 rounded-md border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Item Options (Size, Color, etc.)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addOptionGroup}>
            Add Option Group
          </Button>
        </div>

        {optionGroups.map((group, gIdx) => (
          <OptionGroupEditor
            key={gIdx}
            group={group}
            onChangeName={(name) => updateGroupName(gIdx, name)}
            onAddValue={(val) => addValueToGroup(gIdx, val)}
            onRemoveValue={(vIdx) => removeValueFromGroup(gIdx, vIdx)}
            onRemoveGroup={() => removeOptionGroup(gIdx)}
          />
        ))}

        {/* Variant Matrix */}
        {hasOptions && combinations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Variant Matrix ({combinations.length} variants)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {optionGroups
                      .filter((g) => g.name.trim() && g.values.length > 0)
                      .map((g) => (
                        <th key={g.name} className="px-2 py-1.5 font-medium">
                          {g.name}
                        </th>
                      ))}
                    <th className="px-2 py-1.5 font-medium">
                      <div className="flex items-center gap-2">
                        Stock
                        <input
                          type="number"
                          min={0}
                          placeholder="Set all"
                          className="h-7 w-20 rounded border border-input bg-background px-1.5 text-xs"
                          onChange={(e) => {
                            const val = e.target.value;
                            setAllStock(val === "" ? null : Number(val));
                          }}
                        />
                      </div>
                    </th>
                    <th className="px-2 py-1.5 font-medium">Price Override</th>
                  </tr>
                </thead>
                <tbody>
                  {combinations.map((combo) => {
                    const data = getVariantData(combo);
                    const key = optionsKey(combo);
                    return (
                      <tr key={key} className="border-b border-border/50">
                        {optionGroups
                          .filter((g) => g.name.trim() && g.values.length > 0)
                          .map((g) => (
                            <td key={g.name} className="px-2 py-1.5">
                              {combo[g.name]}
                            </td>
                          ))}
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            placeholder="Unlimited"
                            value={data.stockQuantity ?? ""}
                            onChange={(e) =>
                              setVariantField(
                                combo,
                                "stockQuantity",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                            className="h-8 w-24 rounded border border-input bg-background px-2 text-sm"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min={0}
                            placeholder="Base price"
                            value={data.priceOverride ?? ""}
                            onChange={(e) =>
                              setVariantField(
                                combo,
                                "priceOverride",
                                e.target.value === "" ? null : Number(e.target.value)
                              )
                            }
                            className="h-8 w-24 rounded border border-input bg-background px-2 text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

// ─── Option Group Editor ────────────────────────────────────────

function OptionGroupEditor({
  group,
  onChangeName,
  onAddValue,
  onRemoveValue,
  onRemoveGroup,
}: {
  group: OptionGroupData;
  onChangeName: (name: string) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (idx: number) => void;
  onRemoveGroup: () => void;
}) {
  const [newValue, setNewValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddValue(newValue);
      setNewValue("");
    }
  }

  return (
    <div className="space-y-2 rounded border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Option name (e.g. Size)"
          value={group.name}
          onChange={(e) => onChangeName(e.target.value)}
          className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm"
        />
        <button
          type="button"
          onClick={onRemoveGroup}
          className="p-1 text-muted-foreground hover:text-destructive"
          aria-label="Remove option group"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {group.values.map((val, vIdx) => (
          <span
            key={vIdx}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {val}
            <button
              type="button"
              onClick={() => onRemoveValue(vIdx)}
              className="hover:text-destructive"
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          placeholder="Add value + Enter"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-6 w-32 rounded border border-input bg-background px-2 text-xs"
        />
      </div>
    </div>
  );
}
