export function inviteEmail(args: {
  orgName: string;
  acceptUrl: string;
  invitedBy: string | null;
}): { subject: string; html: string; text: string } {
  const { orgName, acceptUrl, invitedBy } = args;
  const subject = `You've been invited to ${orgName} on SwagVault`;

  const text = [
    `${invitedBy ? invitedBy + ' has' : 'You have been'} invited you to join ${orgName} on SwagVault.`,
    '',
    `Accept the invitation: ${acceptUrl}`,
    '',
    'If you weren\'t expecting this, you can ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
  <h2 style="font-size: 20px; margin: 0 0 16px;">Join ${escape(orgName)} on SwagVault</h2>
  <p style="line-height: 1.5;">${invitedBy ? escape(invitedBy) + ' has invited' : 'You\'ve been invited'} you to join <strong>${escape(orgName)}</strong>.</p>
  <p style="margin: 28px 0;">
    <a href="${escape(acceptUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">Accept invitation</a>
  </p>
  <p style="font-size: 12px; color: #666;">If you weren't expecting this, you can ignore this email.</p>
</body></html>`;

  return { subject, html, text };
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
