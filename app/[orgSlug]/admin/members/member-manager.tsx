'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
              ? 'border-2 border-mint bg-mint/15 px-3 py-2 text-sm font-bold text-mint'
              : 'border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive'
          }
        >
          {banner.kind === 'ok' ? '✓ ' : '⚠ '}{banner.text}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold uppercase">
          Current members
        </h2>
        <div className="overflow-hidden border-2 border-foreground bg-card">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Email</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <MemberTableRow
                  key={m.userId}
                  member={m}
                  currency={currency}
                  expanded={openRowUserId === m.userId}
                  pending={pending}
                  isLast={idx === members.length - 1}
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
    <section className="space-y-4 border-2 border-foreground bg-card p-5 shadow-[5px_5px_0_0_var(--mint)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-bold uppercase">
          Bulk grant balance
        </h2>
        <Badge variant="outline">
          → {recipients.length}{' '}
          {recipients.length === 1 ? 'member' : 'members'}
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="bulk-target">Recipients</Label>
          <select
            id="bulk-target"
            value={target}
            onChange={(e) => setTarget(e.target.value as BulkTarget)}
            className="h-10 w-full border-2 border-foreground bg-background px-3 text-sm text-foreground transition-shadow focus-visible:bg-card focus-visible:shadow-[3px_3px_0_0_var(--primary)] focus-visible:outline-none"
          >
            <option value="all">All members</option>
            <option value="admins">Owners + admins</option>
            <option value="members">Members only</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bulk-amount">Amount</Label>
          <div className="flex items-center gap-2">
            <span className="label-mono text-muted-foreground">
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
        <div className="space-y-2">
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
          variant="mint"
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
        <p className="label-mono text-muted-foreground">
          Each recipient gets{' '}
          <span className="text-foreground">
            {formatAmount(
              Math.round(amountNum * 10 ** currency.decimal_places),
              currency,
            )}
          </span>
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
  isLast,
  onToggle,
  onGrant,
}: {
  member: MemberRow;
  currency: CurrencyConfig;
  expanded: boolean;
  pending: boolean;
  isLast: boolean;
  onToggle: () => void;
  onGrant: (amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const amountNum = Number(amount);
  const canSubmit = Number.isFinite(amountNum) && amountNum > 0;

  return (
    <>
      <tr className={isLast && !expanded ? '' : 'border-b-2 border-foreground/10'}>
        <td className="px-4 py-3 font-bold">{member.email}</td>
        <td className="px-4 py-3">
          <Badge variant={member.role === 'owner' ? 'primary' : 'outline'}>
            {member.role}
          </Badge>
        </td>
        <td className="px-4 py-3 font-heading font-bold tabular-nums">
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
        <tr className={isLast ? 'bg-muted' : 'border-b-2 border-foreground/10 bg-muted'}>
          <td colSpan={4} className="px-4 py-4">
            <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor={`amount-${member.userId}`}>Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="label-mono text-muted-foreground">
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
              <div className="space-y-2">
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
