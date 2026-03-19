/**
 * Sanitize file objects before returning them in API responses.
 * SECURITY: Prevents leaking internal storage paths to the client.
 * Clients should use signed URLs (via /api/files/[id]/url) for file access.
 */

export function sanitizeFile<T extends Record<string, unknown>>(file: T): Omit<T, 'storagePath' | 'storage_path'> {
  const { storagePath, storage_path, ...safe } = file as Record<string, unknown>;
  void storagePath; void storage_path;
  return safe as Omit<T, 'storagePath' | 'storage_path'>;
}

export function sanitizeFiles<T extends Record<string, unknown>>(files: T[]): Omit<T, 'storagePath' | 'storage_path'>[] {
  return files.map(sanitizeFile);
}
