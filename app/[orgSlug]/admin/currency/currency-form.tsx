'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount } from '@/lib/currency/format';
import {
  saveCurrencyAction,
  type SaveCurrencyState,
} from './actions';

const initialState: SaveCurrencyState = { error: null, success: false };

export type CurrencyFormInitial = {
  name: string;
  symbol: string;
  color_hex: string;
  decimal_places: number;
  icon_url: string | null;
};

export function CurrencyForm({
  slug,
  initial,
}: {
  slug: string;
  initial: CurrencyFormInitial;
}) {
  const [state, action, pending] = useActionState(
    saveCurrencyAction,
    initialState,
  );
  const [name, setName] = useState(initial.name);
  const [symbol, setSymbol] = useState(initial.symbol);
  const [color, setColor] = useState(initial.color_hex);
  const [decimals, setDecimals] = useState(initial.decimal_places);

  const sampleAmount = 10 ** (decimals + 3) + 56 * 10 ** Math.max(0, decimals - 2);
  // 0 dp: 1056 → "★1,056"
  // 2 dp: 100056 → "$1,000.56"

  return (
    <form action={action} className="grid gap-6 md:grid-cols-[1fr_240px]">
      <input type="hidden" name="slug" value={slug} />

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Currency name</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              name="symbol"
              required
              maxLength={8}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="color_hex">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="color_hex"
                name="color_hex"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border bg-background"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value.toLowerCase())}
                pattern="#[0-9a-fA-F]{6}"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="decimal_places">Decimal places</Label>
            <select
              id="decimal_places"
              name="decimal_places"
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value))}
              className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
            >
              <option value={0}>0 — whole units (★1,056)</option>
              <option value={2}>2 — like dollars and cents ($10.56)</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="icon">Icon (optional)</Label>
          <input
            id="icon"
            name="icon"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1 file:text-sm hover:file:bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPEG, WebP, or SVG. Up to 2MB. Square images render best.
          </p>
        </div>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600">Currency updated.</p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save currency'}
        </Button>
      </div>

      <aside className="space-y-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Preview
        </div>
        <div
          className="space-y-3 rounded-lg border p-4"
          style={{ borderColor: color }}
        >
          <div className="flex items-center gap-2">
            {initial.icon_url ? (
              <Image
                src={initial.icon_url}
                alt=""
                width={20}
                height={20}
                className="rounded"
              />
            ) : (
              <div
                className="grid h-5 w-5 place-items-center rounded text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {symbol.slice(0, 1)}
              </div>
            )}
            <div className="text-sm font-medium">{name || 'Currency'}</div>
          </div>
          <div className="text-xl font-semibold tabular-nums">
            {formatAmount(sampleAmount, {
              name,
              symbol,
              decimal_places: decimals,
            })}
          </div>
        </div>
      </aside>
    </form>
  );
}
