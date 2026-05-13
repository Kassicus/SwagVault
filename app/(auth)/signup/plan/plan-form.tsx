'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { startCheckoutAction, type PlanState } from './actions';

const initialState: PlanState = { error: null };

export function PlanForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    startCheckoutAction,
    initialState,
  );
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="plan" value={plan} />

      <div className="grid gap-4">
        <PlanOption
          selected={plan === 'monthly'}
          onSelect={() => setPlan('monthly')}
          title="Monthly"
          price="$25"
          cadence="/ month"
          tagline="Cancel anytime."
        />
        <PlanOption
          selected={plan === 'annual'}
          onSelect={() => setPlan('annual')}
          title="Annual"
          price="$220"
          cadence="/ year"
          tagline="Save ~27% vs monthly."
          badge="Best deal"
        />
      </div>
      {state.error ? (
        <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Redirecting…' : 'Continue to checkout →'}
      </Button>
    </form>
  );
}

function PlanOption({
  selected,
  onSelect,
  title,
  price,
  cadence,
  tagline,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  cadence: string;
  tagline: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex items-center justify-between border-2 border-foreground px-5 py-4 text-left transition-all ${
        selected
          ? 'bg-primary text-primary-foreground shadow-[5px_5px_0_0_var(--foreground)]'
          : 'bg-card text-foreground hover:bg-muted'
      }`}
    >
      {badge ? (
        <Badge
          variant={selected ? 'default' : 'mint'}
          className="absolute -top-3 right-4"
        >
          {badge}
        </Badge>
      ) : null}
      <div>
        <div className="font-heading text-lg font-bold uppercase tracking-tight">
          {title}
        </div>
        <div
          className={`text-xs ${
            selected ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {tagline}
        </div>
      </div>
      <div className="text-right">
        <div className="font-heading text-2xl font-bold">{price}</div>
        <div
          className={`label-mono ${
            selected ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}
        >
          {cadence}
        </div>
      </div>
    </button>
  );
}
