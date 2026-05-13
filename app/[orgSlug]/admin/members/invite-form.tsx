'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteMemberAction, type InviteState } from './actions';

const initialState: InviteState = { error: null, success: null };

export function InviteForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    inviteMemberAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="h-10 w-full border-2 border-foreground bg-background px-3 text-sm text-foreground transition-shadow focus-visible:bg-card focus-visible:shadow-[3px_3px_0_0_var(--primary)] focus-visible:outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? 'Sending…' : 'Invite →'}
          </Button>
        </div>
      </div>
      {state.error ? (
        <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
          ⚠ {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="border-2 border-mint bg-mint/15 px-3 py-2 text-sm font-bold text-mint">
          ✓ {state.success}
        </p>
      ) : null}
    </form>
  );
}
