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

  return (
    <form action={action} className="grid gap-6 md:grid-cols-[1fr_280px]">
      <input type="hidden" name="slug" value={slug} />

      <div className="space-y-5 border-2 border-foreground bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="color_hex">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="color_hex"
                name="color_hex"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 cursor-pointer border-2 border-foreground bg-background p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value.toLowerCase())}
                pattern="#[0-9a-fA-F]{6}"
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decimal_places">Decimal places</Label>
            <select
              id="decimal_places"
              name="decimal_places"
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value))}
              className="h-10 w-full border-2 border-foreground bg-background px-3 text-sm text-foreground transition-shadow focus-visible:bg-card focus-visible:shadow-[3px_3px_0_0_var(--primary)] focus-visible:outline-none"
            >
              <option value={0}>0 — whole units (★1,056)</option>
              <option value={2}>2 — like dollars and cents ($10.56)</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="icon">Icon (optional)</Label>
          <input
            id="icon"
            name="icon"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:border-2 file:border-foreground file:bg-card file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:font-bold file:uppercase file:tracking-wider file:text-foreground hover:file:bg-muted"
          />
          <p className="label-mono text-muted-foreground">
            PNG, JPEG, WebP, or SVG. Up to 2MB. Square images render best.
          </p>
        </div>

        {state.error ? (
          <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
            ⚠ {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="border-2 border-mint bg-mint/15 px-3 py-2 text-sm font-bold text-mint">
            ✓ Currency updated.
          </p>
        ) : null}

        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Saving…' : 'Save currency'}
        </Button>
      </div>

      <aside className="space-y-3">
        <div className="label-mono text-muted-foreground">Preview</div>
        <div
          className="space-y-3 border-2 bg-card p-5 shadow-[5px_5px_0_0_var(--foreground)]"
          style={{ borderColor: color }}
        >
          <div className="flex items-center gap-2">
            {initial.icon_url ? (
              <Image
                src={initial.icon_url}
                alt=""
                width={24}
                height={24}
                className="border-2 border-foreground"
              />
            ) : (
              <div
                className="grid size-6 place-items-center border-2 border-foreground text-xs font-bold text-black"
                style={{ backgroundColor: color }}
              >
                {symbol.slice(0, 1)}
              </div>
            )}
            <div className="font-heading text-sm font-bold uppercase">
              {name || 'Currency'}
            </div>
          </div>
          <div className="font-heading text-3xl font-black tabular-nums">
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
