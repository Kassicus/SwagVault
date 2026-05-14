import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b-2 border-foreground px-6 py-4 sm:px-10">
        <Link
          href="/"
          className="font-heading text-lg font-bold uppercase tracking-tight"
        >
          SwagVault
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={buttonVariants({ size: 'sm' })}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-1 items-center px-6 py-16 sm:px-10 sm:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div className="space-y-8">
            <Badge variant="mint">
              <span className="size-1.5 animate-pulse bg-current" />
              New · v1.0
            </Badge>

            <h1 className="font-heading text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              Coins.
              <br />
              Merch.
              <br />
              <span className="text-secondary">Happy team.</span>
            </h1>

            <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
              Reward your team with your own internal currency. They spend it in
              a private storefront for company merch — set up in 60 seconds, no
              procurement BS.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className={buttonVariants({ size: 'lg' })}
              >
                Start free →
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Sign in
              </Link>
            </div>

          </div>

          {/* Right side: stacked feature "cards" — chunky brutalist tiles. */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 border-2 border-foreground/20" />
            <div className="grid gap-4">
              <FeatureTile
                accent="primary"
                tag="01"
                title="Issue coins"
                body="Bulk-grant balances by team, role, or one-off. Notes attach to every transaction."
              />
              <FeatureTile
                accent="secondary"
                tag="02"
                title="Stock the store"
                body="Add products with sizes, colors, inventory. Brand the currency to your org."
              />
              <FeatureTile
                accent="mint"
                tag="03"
                title="Ship the swag"
                body="Pickup or shipping. Mark fulfilled. Cancel + refund in one click."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t-2 border-foreground px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-muted-foreground">
          <span>© SwagVault</span>
          <span className="label-mono">v1.0</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureTile({
  accent,
  tag,
  title,
  body,
}: {
  accent: 'primary' | 'secondary' | 'mint';
  tag: string;
  title: string;
  body: string;
}) {
  const shadowClass =
    accent === 'primary'
      ? 'shadow-[5px_5px_0_0_var(--primary)]'
      : accent === 'secondary'
        ? 'shadow-[5px_5px_0_0_var(--secondary)]'
        : 'shadow-[5px_5px_0_0_var(--mint)]';
  const tagBg =
    accent === 'primary'
      ? 'bg-primary text-primary-foreground'
      : accent === 'secondary'
        ? 'bg-secondary text-secondary-foreground'
        : 'bg-mint text-mint-foreground';
  return (
    <div
      className={`relative border-2 border-foreground bg-card p-5 ${shadowClass}`}
    >
      <div
        className={`absolute -top-3 left-4 inline-flex border-2 border-foreground px-2 py-0.5 font-mono text-[10px] font-bold ${tagBg}`}
      >
        {tag}
      </div>
      <h3 className="font-heading text-xl font-bold uppercase tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
