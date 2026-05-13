import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          SwagVault
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
