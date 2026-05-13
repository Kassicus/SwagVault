'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import {
  cancelOrderAction,
  fulfillOrderAction,
  type AdminOrderActionResult,
} from '../actions';

const initialState: AdminOrderActionResult = { error: null };

export function OrderActionButtons({
  slug,
  orderId,
  status,
}: {
  slug: string;
  orderId: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
}) {
  const [fulfillState, fulfillFormAction, fulfilling] = useActionState(
    fulfillOrderAction,
    initialState,
  );
  const [cancelState, cancelFormAction, cancelling] = useActionState(
    cancelOrderAction,
    initialState,
  );

  const error = fulfillState.error ?? cancelState.error;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status !== 'fulfilled' && status !== 'cancelled' ? (
          <form action={fulfillFormAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="order_id" value={orderId} />
            <Button type="submit" disabled={fulfilling || cancelling}>
              {fulfilling ? 'Marking fulfilled…' : 'Mark fulfilled'}
            </Button>
          </form>
        ) : null}
        {status !== 'cancelled' ? (
          <form
            action={cancelFormAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  'Cancel this order? The buyer will be refunded and inventory restored.',
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="order_id" value={orderId} />
            <Button
              type="submit"
              variant="destructive"
              disabled={fulfilling || cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel + refund'}
            </Button>
          </form>
        ) : null}
      </div>
      {error ? (
        <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
          ⚠ {error}
        </p>
      ) : null}
    </div>
  );
}
