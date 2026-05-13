'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { acceptInviteAction, type AcceptState } from './actions';

const initialState: AcceptState = { error: null };

export function AcceptForm({ token, role }: { token: string; role: string }) {
  const [state, formAction, pending] = useActionState(
    acceptInviteAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted-foreground">
        You&rsquo;ll join as a <strong>{role}</strong>.
      </p>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Joining…' : 'Accept invitation'}
      </Button>
    </form>
  );
}
