import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAdmin } from '@/lib/auth/session';

// Issues a short-lived upload token to authenticated admins. The client uses
// it to upload directly to Vercel Blob, bypassing Server Action body limits.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (_pathname, clientPayload) => {
      const payload = clientPayload ? JSON.parse(clientPayload) : null;
      const slug = payload?.slug;
      if (!slug || typeof slug !== 'string') {
        throw new Error('Missing slug');
      }
      // Throws/redirects if the caller isn't an admin of the org.
      await requireAdmin(slug);
      return {
        allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp'],
        addRandomSuffix: true,
        maximumSizeInBytes: 5 * 1024 * 1024,
      };
    },
    onUploadCompleted: async () => {
      // no-op: we save the final URL list via the product Server Action
    },
  });
  return Response.json(jsonResponse);
}
