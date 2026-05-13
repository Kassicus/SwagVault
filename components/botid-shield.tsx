import { BotIdClient } from 'botid/client';
import { PROTECTED_ROUTES } from '@/lib/botid/protect';

// Mounts the BotID client-side challenge for pages that host protected
// Server Actions. Safe to render in a Server Component because
// BotIdClient is a 'use client' module that just registers itself.
export function BotIdShield() {
  return <BotIdClient protect={[...PROTECTED_ROUTES]} />;
}
