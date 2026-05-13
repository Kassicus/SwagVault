import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col">
      <header className="relative z-10 border-b-2 border-foreground px-6 py-4">
        <Link
          href="/"
          className="font-heading text-lg font-bold uppercase tracking-tight"
        >
          SwagVault
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
