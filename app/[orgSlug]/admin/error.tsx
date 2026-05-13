'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="mx-auto max-w-md space-y-5 py-10 text-center">
      <Badge variant="warn" className="mx-auto">
        Admin error
      </Badge>
      <h2 className="font-heading text-3xl font-black uppercase tracking-tight">
        We couldn&rsquo;t load this page
      </h2>
      <p className="text-sm text-muted-foreground">
        Something failed while loading the admin area. The org and Supabase
        connection might be temporarily unreachable.
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
  );
}
