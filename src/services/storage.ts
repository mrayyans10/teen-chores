import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { PHOTO_BUCKET, supabase } from '@/supabase/client';

/**
 * Upload a local image (file:// uri from expo-image-picker) to Supabase
 * Storage and return its public URL.
 *
 * Note: uploading a Blob in React Native produces a 0-byte file, so we read the
 * image as base64 (SDK 56 File API) and upload an ArrayBuffer instead.
 */
export async function uploadPhoto(
  localUri: string,
  pathPrefix: string
): Promise<string> {
  const base64 = await new File(localUri).base64();
  const arrayBuffer = decode(base64);

  const path = `${pathPrefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.jpg`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
