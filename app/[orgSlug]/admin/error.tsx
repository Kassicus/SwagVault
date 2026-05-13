'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error boundary:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-center">
      <h2 className="text-xl font-semibold tracking-tight">
        We couldn&rsquo;t load this page
      </h2>
      <p className="text-sm text-muted-foreground">
        Something failed while loading the admin area. The org and Supabase
        connection might be temporarily unreachable.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          ref: {error.digest}
        </p>
      ) : null}
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
