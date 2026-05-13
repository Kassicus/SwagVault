'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary:', error);
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We hit an unexpected error. Try again, and if it keeps happening,
          contact support.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            ref: {error.digest}
          </p>
        ) : null}
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </main>
  );
}
