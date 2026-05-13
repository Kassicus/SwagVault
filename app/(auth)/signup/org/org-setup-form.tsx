'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { slugify } from '@/lib/slug';
import {
  checkSlugAvailability,
  createOrgAction,
  type OrgSetupState,
  type SlugAvailability,
} from './actions';

const initialState: OrgSetupState = { error: null };

export function OrgSetupForm() {
  const [state, formAction, pending] = useActionState(createOrgAction, initialState);
  const [name, setName] = useState('');
  const [manualSlug, setManualSlug] = useState<string | null>(null);
  const slug = manualSlug ?? slugify(name);
  const [availability, setAvailability] = useState<SlugAvailability | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const result = await checkSlugAvailability(slug);
      if (!cancelled) setAvailability(result);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [slug]);

  // If the user clears the slug input, ignore any stale availability result.
  const displayAvailability = slug ? availability : null;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Co"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">URL slug</Label>
        <div className="flex items-center gap-1 rounded-lg border bg-background px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="text-sm text-muted-foreground">swagvault.com/</span>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => setManualSlug(e.target.value.toLowerCase())}
            className="flex-1 bg-transparent py-1.5 text-sm outline-none"
            placeholder="acme"
            pattern="[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?"
          />
        </div>
        <SlugStatus availability={displayAvailability} slug={slug} />
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button
        type="submit"
        disabled={
          pending ||
          (displayAvailability !== null && !displayAvailability.available)
        }
        className="w-full"
      >
        {pending ? 'Creating…' : 'Continue to plan'}
      </Button>
    </form>
  );
}

function SlugStatus({
  availability,
  slug,
}: {
  availability: SlugAvailability | null;
  slug: string;
}) {
  if (!slug) return null;
  if (availability === null) {
    return <p className="text-xs text-muted-foreground">Checking…</p>;
  }
  if (availability.available) {
    return <p className="text-xs text-emerald-600">Available</p>;
  }
  const messages: Record<typeof availability.reason, string> = {
    'too-short': 'Too short — needs at least 2 characters.',
    invalid: 'Use lowercase letters, numbers, and hyphens.',
    reserved: 'That slug is reserved.',
    taken: 'That slug is taken.',
  };
  return <p className="text-xs text-destructive">{messages[availability.reason]}</p>;
}
