'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptInviteAction, type AcceptState } from './actions';

const initialState: AcceptState = { error: null };

export function AcceptForm({
  token,
  email,
  role,
  orgName,
}: {
  token: string;
  email: string;
  role: string;
  orgName: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptInviteAction,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted-foreground">
        Welcome to <strong>{orgName}</strong>. Set a password and you&rsquo;ll
        be signed in as a <strong>{role}</strong>.
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          value={email}
          readOnly
          aria-readonly
          className="cursor-not-allowed opacity-70"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Setting up…' : 'Create account & sign in'}
      </Button>
    </form>
  );
}
