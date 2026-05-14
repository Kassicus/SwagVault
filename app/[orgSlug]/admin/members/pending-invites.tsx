'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  resendInviteAction,
  revokeInviteAction,
  type InviteRowState,
} from './actions';

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
};

type Banner = { kind: 'ok' | 'err'; text: string } | null;

export function PendingInvitesTable({
  slug,
  invites,
}: {
  slug: string;
  invites: PendingInvite[];
}) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(
    inviteId: string,
    action: (
      prev: InviteRowState,
      formData: FormData,
    ) => Promise<InviteRowState>,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBanner(null);
    setPendingId(inviteId);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('slug', slug);
      fd.set('invite_id', inviteId);
      const result = await action({ error: null, success: null }, fd);
      setPendingId(null);
      if (result.error) {
        setBanner({ kind: 'err', text: result.error });
        return;
      }
      setBanner({ kind: 'ok', text: result.success ?? 'Done.' });
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-xl font-bold uppercase">
        Pending invites
      </h2>

      {banner ? (
        <div
          className={
            banner.kind === 'ok'
              ? 'border-2 border-mint bg-mint/15 px-3 py-2 text-sm font-bold text-mint'
              : 'border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive'
          }
        >
          {banner.kind === 'ok' ? '✓ ' : '⚠ '}
          {banner.text}
        </div>
      ) : null}

      <div className="overflow-hidden border-2 border-foreground bg-card">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Email</th>
              <th className="px-4 py-3 font-bold">Role</th>
              <th className="px-4 py-3 font-bold">Expires</th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((i, idx) => {
              const isPending = pendingId === i.id;
              return (
                <tr
                  key={i.id}
                  className={
                    idx === invites.length - 1
                      ? ''
                      : 'border-b-2 border-foreground/10'
                  }
                >
                  <td className="px-4 py-3">{i.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{i.role}</Badge>
                  </td>
                  <td className="px-4 py-3 label-mono text-muted-foreground">
                    {new Date(i.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => run(i.id, resendInviteAction)}
                      >
                        {isPending ? '…' : 'Resend'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() =>
                          run(
                            i.id,
                            revokeInviteAction,
                            `Revoke the invite for ${i.email}? The link will stop working immediately.`,
                          )
                        }
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
