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
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            defaultValue="member"
            className="h-8 rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? 'Sending…' : 'Invite'}
          </Button>
        </div>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
    </form>
  );
}
