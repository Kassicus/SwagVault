// Routes that should be protected by Vercel BotID. The list is shared between
// the client component (so the challenge JS knows where to attach) and any
// server-side reference. Each entry is the URL the Server Action POSTs to.
//
// In Next.js App Router, a Server Action submitted from <form action={action}>
// hits the URL of the page hosting the action. So protecting /signup means
// protecting the signup Server Action.

export const PROTECTED_ROUTES = [
  { path: '/signup', method: 'POST' },
  { path: '/accept-invite/[token]', method: 'POST' },
] as const;
