import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="space-y-4">
        <h1 className="text-5xl font-semibold tracking-tight">SwagVault</h1>
        <p className="max-w-prose text-balance text-lg text-muted-foreground">
          Reward your team with your own internal currency. They spend it in a
          private storefront for company merch.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
          Get started
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ variant: 'outline', size: 'lg' })}
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
