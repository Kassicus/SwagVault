'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FulfillmentMode } from '@/lib/supabase/types';
import { updateOrgSettingsAction, type SettingsState } from './actions';

const initialState: SettingsState = { error: null, success: null };

export function SettingsForm({
  slug,
  initial,
}: {
  slug: string;
  initial: {
    name: string;
    fulfillment_mode: FulfillmentMode;
    pickup_location: string | null;
    leaderboard_enabled: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateOrgSettingsAction,
    initialState,
  );
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>(
    initial.fulfillment_mode,
  );

  const pickupRelevant =
    fulfillmentMode === 'pickup' || fulfillmentMode === 'both';

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <input type="hidden" name="slug" value={slug} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial.name}
          required
          maxLength={100}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Fulfillment</legend>
        <div className="grid gap-2">
          {(['pickup', 'shipping', 'both'] as const).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                fulfillmentMode === m
                  ? 'border-foreground bg-muted/40'
                  : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="radio"
                name="fulfillment_mode"
                value={m}
                checked={fulfillmentMode === m}
                onChange={() => setFulfillmentMode(m)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">
                  {m === 'pickup'
                    ? 'Pickup only'
                    : m === 'shipping'
                      ? 'Shipping only'
                      : 'Both (member picks at checkout)'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {m === 'pickup'
                    ? 'Members grab orders from a designated location.'
                    : m === 'shipping'
                      ? 'Members enter a shipping address at checkout.'
                      : 'Members can choose ship-to-me or pickup.'}
                </div>
              </div>
            </label>
          ))}
        </div>
        {pickupRelevant ? (
          <div className="space-y-1.5">
            <Label htmlFor="pickup_location">Pickup location (optional)</Label>
            <Input
              id="pickup_location"
              name="pickup_location"
              defaultValue={initial.pickup_location ?? ''}
              placeholder="2nd floor reception desk"
            />
            <p className="text-xs text-muted-foreground">
              Shown to members on the order page.
            </p>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Leaderboard</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="leaderboard_enabled"
            defaultChecked={initial.leaderboard_enabled}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Show a leaderboard</span>
            <span className="block text-xs text-muted-foreground">
              When on, members can visit /{slug}/leaderboard and see top
              spenders over the last 30 days. Individuals can opt out from
              their account page.
            </span>
          </span>
        </label>
      </fieldset>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
