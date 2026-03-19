import { supabaseAdmin } from './supabase-admin';

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('cad-files')
    .createSignedUrl(storagePath, 3600);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function deleteFromStorage(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from('cad-files')
    .remove([storagePath]);

  if (error) {
    throw error;
  }
}
