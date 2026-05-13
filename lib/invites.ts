import { randomBytes, createHash } from 'node:crypto';

export function generateInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const INVITE_TTL_DAYS = 7;
