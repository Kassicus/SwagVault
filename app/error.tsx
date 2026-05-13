'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <main className="relative flex min-h-svh items-center justify-center px-6 py-12">
      <div className="max-w-md space-y-5 text-center">
        <Badge variant="warn" className="mx-auto">
          Error
        </Badge>
        <h1 className="font-heading text-4xl font-black uppercase tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We hit an unexpected error. Try again, and if it keeps happening,
          contact support.
        </p>
        {error.digest ? (
          <p className="border-2 border-foreground/20 bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
            ref: {error.digest}
          </p>
        ) : null}
        <Button onClick={() => reset()} size="lg">
          Try again →
        </Button>
      </div>
    </main>
  );
}
