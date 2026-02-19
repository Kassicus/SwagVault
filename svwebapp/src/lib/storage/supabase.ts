import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

const BUCKET = "swagvault-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

function getClient() {
  return createClient(config.supabase.url(), config.supabase.serviceRoleKey());
}

function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size must be under 5MB");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("File must be JPEG, PNG, WebP, or SVG");
  }
}

export async function uploadItemImage(
  tenantId: string,
  itemId: string,
  file: File,
  filename?: string
): Promise<string> {
  validateFile(file);
  const supabase = getClient();
  const ext = file.name.split(".").pop();
  const path = `${tenantId}/items/${itemId}/${filename ?? `image-${Date.now()}`}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function uploadOrgLogo(
  tenantId: string,
  file: File
): Promise<string> {
  validateFile(file);
  const supabase = getClient();
  const ext = file.name.split(".").pop();
  const path = `${tenantId}/logo/org-logo.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
