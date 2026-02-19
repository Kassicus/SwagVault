import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-2 text-xl text-muted-foreground">Page not found</p>
      <Link href="/" className="mt-6">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
