'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount, type CurrencyConfig } from '@/lib/currency/format';
import type { ProductWithVariants } from '@/lib/products/server';
import type { VariantInput } from '@/lib/products/types';
import {
  createProductAction,
  updateProductAction,
  type SaveState,
} from './actions';

type Props = {
  slug: string;
  currency: CurrencyConfig & { color_hex: string };
  initial?: ProductWithVariants;
};

const blankVariant = (): VariantInput => ({
  name: 'default',
  options: {},
  price_minor_units: 0,
  inventory_count: 0,
  position: 0,
  active: true,
});

export function ProductForm({ slug, currency, initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [active, setActive] = useState(initial?.active ?? true);

  const [existingImages, setExistingImages] = useState<string[]>(
    initial?.image_paths ?? [],
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const initialVariants: VariantInput[] = initial?.variants.length
    ? initial.variants.map((v) => ({
        id: v.id,
        name: v.name,
        options: (v.options as Record<string, string>) ?? {},
        price_minor_units: v.price_minor_units,
        inventory_count: v.inventory_count,
        position: v.position,
        active: v.active,
      }))
    : [blankVariant()];

  const [variants, setVariants] = useState<VariantInput[]>(initialVariants);
  const [hasVariants, setHasVariants] = useState(initialVariants.length > 1);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previews = useMemo(
    () => pendingFiles.map((f) => URL.createObjectURL(f)),
    [pendingFiles],
  );
  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews],
  );

  const totalImages = existingImages.length + pendingFiles.length;
  const canAddMore = totalImages < 8;

  function updateVariant(idx: number, patch: Partial<VariantInput>) {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    );
  }

  function updateVariantOption(idx: number, key: string, value: string) {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        const options = { ...v.options };
        if (value) options[key] = value;
        else delete options[key];
        // Auto-generate a sensible name from option values when present.
        const autoName = Object.values(options)
          .filter((x): x is string => !!x)
          .join(' / ');
        return {
          ...v,
          options,
          name: autoName || v.name || `Variant ${idx + 1}`,
        };
      }),
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        name: `Variant ${prev.length + 1}`,
        options: {},
        price_minor_units: 0,
        inventory_count: 0,
        position: prev.length,
        active: true,
      },
    ]);
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleHasVariants(next: boolean) {
    if (!next && variants.length > 1) {
      const ok = window.confirm(
        `Disabling variants will keep only "${variantLabel(variants[0])}" and remove the other ${variants.length - 1} variant(s). Continue?`,
      );
      if (!ok) return;
      setVariants([
        {
          ...variants[0],
          name: 'default',
          options: {},
        },
      ]);
    }
    setHasVariants(next);
  }

  function handleAddFiles(files: FileList | null) {
    if (!files) return;
    const room = 8 - totalImages;
    const incoming = Array.from(files).slice(0, room);
    setPendingFiles((prev) => [...prev, ...incoming]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (variants.length === 0) {
      setError('Add at least one variant.');
      return;
    }
    const variantsToSave = hasVariants ? variants : [variants[0]];

    startTransition(async () => {
      try {
        const newUrls: string[] = [];
        for (const file of pendingFiles) {
          const blob = await upload(
            `products/${Date.now()}-${file.name}`,
            file,
            {
              access: 'public',
              handleUploadUrl: '/api/admin/blob-upload',
              clientPayload: JSON.stringify({ slug }),
            },
          );
          newUrls.push(blob.url);
        }

        const fd = new FormData();
        fd.set('slug', slug);
        if (initial?.id) fd.set('product_id', initial.id);
        fd.set('name', name.trim());
        fd.set('description', description.trim());
        fd.set('tags', tags);
        if (active) fd.set('active', 'on');
        fd.set(
          'image_paths_json',
          JSON.stringify([...existingImages, ...newUrls]),
        );
        fd.set('variants_json', JSON.stringify(variantsToSave));

        const action = isEdit ? updateProductAction : createProductAction;
        const result = await action({ error: null } satisfies SaveState, fd);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.redirectTo) {
          router.push(result.redirectTo);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <section className="space-y-5 border-2 border-foreground bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="block w-full border-2 border-foreground bg-background px-3 py-2 text-sm text-foreground transition-shadow placeholder:text-muted-foreground/70 focus-visible:bg-card focus-visible:shadow-[3px_3px_0_0_var(--primary)] focus-visible:outline-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="apparel, drinkware"
          />
          <p className="label-mono text-muted-foreground">
            Comma-separated. Used for storefront filtering.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="label-mono">Active (visible to members)</span>
        </label>
      </section>

      <section className="space-y-3 border-2 border-foreground bg-card p-5">
        <div className="flex items-center justify-between">
          <Label>Images</Label>
          <span className="label-mono text-muted-foreground">
            {totalImages} / 8
          </span>
        </div>
        {totalImages > 0 ? (
          <div className="grid grid-cols-4 gap-3">
            {existingImages.map((url, i) => (
              <Thumb
                key={`e-${url}`}
                src={url}
                onRemove={() =>
                  setExistingImages((prev) => prev.filter((_, j) => j !== i))
                }
              />
            ))}
            {pendingFiles.map((_, i) => (
              <Thumb
                key={`p-${i}`}
                src={previews[i]}
                pending
                onRemove={() =>
                  setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                }
              />
            ))}
          </div>
        ) : null}
        {canAddMore ? (
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              handleAddFiles(e.target.files);
              e.target.value = '';
            }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:border-2 file:border-foreground file:bg-card file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:text-foreground hover:file:bg-muted"
          />
        ) : null}
        <p className="label-mono text-muted-foreground">
          PNG, JPEG, or WebP. Up to 5MB each.
        </p>
      </section>

      <section className="space-y-4 border-2 border-foreground bg-card p-5">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => toggleHasVariants(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="label-mono">This product has variants (sizes, colors, etc.)</span>
        </label>

        {hasVariants ? (
          <div className="space-y-3">
            {variants.map((v, i) => (
              <VariantRow
                key={v.id ?? `new-${i}`}
                variant={v}
                index={i}
                currency={currency}
                onChange={(patch) => updateVariant(i, patch)}
                onOption={(k, val) => updateVariantOption(i, k, val)}
                onRemove={
                  variants.length > 1 ? () => removeVariant(i) : undefined
                }
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              + Add variant
            </Button>
          </div>
        ) : (
          <SingleVariantEditor
            variant={variants[0] ?? blankVariant()}
            currency={currency}
            onChange={(patch) => updateVariant(0, patch)}
          />
        )}
      </section>

      {error ? (
        <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
          ⚠ {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(`/${slug}/admin/products`)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function variantLabel(v: VariantInput): string {
  const vals = Object.values(v.options).filter((x): x is string => !!x);
  if (vals.length > 0) return vals.join(' / ');
  return v.name;
}

function Thumb({
  src,
  pending,
  onRemove,
}: {
  src: string;
  pending?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="relative aspect-square overflow-hidden border-2 border-foreground">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        unoptimized={pending}
        sizes="120px"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-1 top-1 grid size-6 place-items-center border-2 border-foreground bg-background text-xs font-bold text-foreground hover:bg-secondary hover:text-secondary-foreground"
      >
        ×
      </button>
      {pending ? (
        <span className="absolute bottom-1 left-1 border border-foreground bg-mint px-1 font-mono text-[9px] font-bold uppercase tracking-wider text-mint-foreground">
          New
        </span>
      ) : null}
    </div>
  );
}

function SingleVariantEditor({
  variant,
  currency,
  onChange,
}: {
  variant: VariantInput;
  currency: CurrencyConfig;
  onChange: (patch: Partial<VariantInput>) => void;
}) {
  const scale = 10 ** currency.decimal_places;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="price">Price</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{currency.symbol}</span>
          <Input
            id="price"
            type="number"
            min={0}
            step={scale === 1 ? 1 : 1 / scale}
            value={variant.price_minor_units / scale}
            onChange={(e) =>
              onChange({
                price_minor_units: Math.round(Number(e.target.value) * scale),
              })
            }
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="inventory">Inventory</Label>
        <Input
          id="inventory"
          type="number"
          min={0}
          step={1}
          value={variant.inventory_count}
          onChange={(e) =>
            onChange({ inventory_count: Math.max(0, Number(e.target.value)) })
          }
        />
      </div>
    </div>
  );
}

function VariantRow({
  variant,
  index,
  currency,
  onChange,
  onOption,
  onRemove,
}: {
  variant: VariantInput;
  index: number;
  currency: CurrencyConfig;
  onChange: (patch: Partial<VariantInput>) => void;
  onOption: (key: string, val: string) => void;
  onRemove?: () => void;
}) {
  const scale = 10 ** currency.decimal_places;
  const previewName = variantLabel(variant) || `Variant ${index + 1}`;

  return (
    <div className="space-y-3 border-2 border-foreground bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="label-mono text-foreground">{previewName}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="label-mono text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Input
          placeholder="Size (e.g. M)"
          value={variant.options.size ?? ''}
          onChange={(e) => onOption('size', e.target.value)}
        />
        <Input
          placeholder="Color (e.g. Red)"
          value={variant.options.color ?? ''}
          onChange={(e) => onOption('color', e.target.value)}
        />
        <div className="flex items-center gap-2">
          <span className="label-mono text-muted-foreground">{currency.symbol}</span>
          <Input
            type="number"
            min={0}
            step={scale === 1 ? 1 : 1 / scale}
            value={variant.price_minor_units / scale}
            onChange={(e) =>
              onChange({
                price_minor_units: Math.round(Number(e.target.value) * scale),
              })
            }
            placeholder="Price"
          />
        </div>
        <Input
          type="number"
          min={0}
          step={1}
          value={variant.inventory_count}
          onChange={(e) =>
            onChange({ inventory_count: Math.max(0, Number(e.target.value)) })
          }
          placeholder="Inventory"
        />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={variant.active}
            onChange={(e) => onChange({ active: e.target.checked })}
            className="size-4 accent-primary"
          />
          <span className="label-mono">Active</span>
        </label>
        <span className="label-mono text-muted-foreground">
          Sample:{' '}
          {formatAmount(variant.price_minor_units, {
            name: currency.name,
            symbol: currency.symbol,
            decimal_places: currency.decimal_places,
          })}
        </span>
      </div>
    </div>
  );
}
