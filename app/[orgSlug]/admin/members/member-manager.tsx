'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Money } from '@/lib/currency/money';
import { formatAmount, type CurrencyConfig } from '@/lib/currency/format';
import type { MemberRole } from '@/lib/supabase/types';
import { grantBalanceAction } from './actions';

export type MemberRow = {
  userId: string;
  email: string;
  role: MemberRole;
  balanceMinorUnits: number;
};

type Banner = { kind: 'ok'; text: string } | { kind: 'err'; text: string } | null;

type BulkTarget = 'all' | 'admins' | 'members';

export function MemberManager({
  slug,
  members,
  currency,
}: {
  slug: string;
  members: MemberRow[];
  currency: CurrencyConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [banner, setBanner] = useState<Banner>(null);
  const [openRowUserId, setOpenRowUserId] = useState<string | null>(null);

  function grant(input: {
    userIds: string[];
    amount: number;
    note: string;
  }) {
    setBanner(null);
    startTransition(async () => {
      const result = await grantBalanceAction({ slug, ...input });
      if (result.error) {
        setBanner({ kind: 'err', text: result.error });
        return;
      }
      setBanner({ kind: 'ok', text: result.success ?? 'Granted.' });
      setOpenRowUserId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <BulkGrantCard
        members={members}
        currency={currency}
        pending={pending}
        onSubmit={grant}
      />

      {banner ? (
        <div
          className={
            banner.kind === 'ok'
              ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900'
              : 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          }
        >
          {banner.text}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Current members</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-normal">Email</th>
                <th className="px-4 py-2 font-normal">Role</th>
                <th className="px-4 py-2 font-normal">Balance</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <MemberTableRow
                  key={m.userId}
                  member={m}
                  currency={currency}
                  expanded={openRowUserId === m.userId}
                  pending={pending}
                  onToggle={() =>
                    setOpenRowUserId((prev) =>
                      prev === m.userId ? null : m.userId,
                    )
                  }
                  onGrant={(amount, note) =>
                    grant({ userIds: [m.userId], amount, note })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BulkGrantCard({
  members,
  currency,
  pending,
  onSubmit,
}: {
  members: MemberRow[];
  currency: CurrencyConfig;
  pending: boolean;
  onSubmit: (input: { userIds: string[]; amount: number; note: string }) => void;
}) {
  const [target, setTarget] = useState<BulkTarget>('all');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const recipients = useMemo(() => {
    switch (target) {
      case 'admins':
        return members.filter((m) => m.role !== 'member');
      case 'members':
        return members.filter((m) => m.role === 'member');
      default:
        return members;
    }
  }, [members, target]);

  const amountNum = Number(amount);
  const canSubmit =
    Number.isFinite(amountNum) && amountNum > 0 && recipients.length > 0;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Grant balance to multiple members</h2>
        <span className="text-xs text-muted-foreground">
          Will grant to <strong>{recipients.length}</strong>{' '}
          {recipients.length === 1 ? 'member' : 'members'}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="bulk-target">Recipients</Label>
          <select
            id="bulk-target"
            value={target}
            onChange={(e) => setTarget(e.target.value as BulkTarget)}
            className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
          >
            <option value="all">All members</option>
            <option value="admins">Owners + admins</option>
            <option value="members">Members only</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-amount">Amount</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currency.symbol}
            </span>
            <Input
              id="bulk-amount"
              type="number"
              min={0}
              step={currency.decimal_places === 0 ? 1 : 1 / 10 ** currency.decimal_places}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bulk-note">Note (optional)</Label>
          <Input
            id="bulk-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Q3 bonus"
          />
        </div>
        <Button
          type="button"
          disabled={!canSubmit || pending}
          onClick={() =>
            onSubmit({
              userIds: recipients.map((r) => r.userId),
              amount: amountNum,
              note,
            })
          }
        >
          {pending ? 'Granting…' : 'Grant'}
        </Button>
      </div>
      {canSubmit ? (
        <p className="text-xs text-muted-foreground">
          Each recipient will receive{' '}
          <strong>
            {formatAmount(
              Math.round(amountNum * 10 ** currency.decimal_places),
              currency,
            )}
          </strong>
          .
        </p>
      ) : null}
    </section>
  );
}

function MemberTableRow({
  member,
  currency,
  expanded,
  pending,
  onToggle,
  onGrant,
}: {
  member: MemberRow;
  currency: CurrencyConfig;
  expanded: boolean;
  pending: boolean;
  onToggle: () => void;
  onGrant: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const amountNum = Number(amount);
  const canSubmit = Number.isFinite(amountNum) && amountNum > 0;

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="px-4 py-3">{member.email}</td>
        <td className="px-4 py-3 text-muted-foreground">{member.role}</td>
        <td className="px-4 py-3">
          <Money amount={member.balanceMinorUnits} currency={currency} />
        </td>
        <td className="px-4 py-3 text-right">
          <Button
            type="button"
            size="sm"
            variant={expanded ? 'outline' : 'default'}
            onClick={onToggle}
          >
            {expanded ? 'Cancel' : 'Grant'}
          </Button>
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-muted/20">
          <td colSpan={4} className="px-4 py-3">
            <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor={`amount-${member.userId}`}>Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {currency.symbol}
                  </span>
                  <Input
                    id={`amount-${member.userId}`}
                    type="number"
                    min={0}
                    step={
                      currency.decimal_places === 0
                        ? 1
                        : 1 / 10 ** currency.decimal_places
                    }
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`note-${member.userId}`}>Note (optional)</Label>
                <Input
                  id={`note-${member.userId}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="Birthday bonus"
                />
              </div>
              <Button
                type="button"
                disabled={!canSubmit || pending}
                onClick={() => onGrant(amountNum, note)}
              >
                {pending ? 'Granting…' : 'Grant'}
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
