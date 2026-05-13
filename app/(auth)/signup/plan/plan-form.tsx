'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { startCheckoutAction, type PlanState } from './actions';

const initialState: PlanState = { error: null };

export function PlanForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    startCheckoutAction,
    initialState,
  );
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="plan" value={plan} />

      <div className="grid gap-3">
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
        />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Redirecting…' : 'Continue to checkout'}
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
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  cadence: string;
  tagline: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? 'border-foreground bg-muted/40'
          : 'border-border hover:bg-muted/30'
      }`}
    >
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{tagline}</div>
      </div>
      <div className="text-right">
        <div className="text-base font-semibold">{price}</div>
        <div className="text-xs text-muted-foreground">{cadence}</div>
      </div>
    </button>
  );
}
