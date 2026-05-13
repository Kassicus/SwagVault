// Validate a `?next=` redirect target so we never bounce users off-site.
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}
