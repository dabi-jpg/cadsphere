/**
 * Shared validation constants and Zod schemas for CAD file platform.
 * 
 * Used by both frontend (pre-upload validation) and backend (route handlers).
 * Ensures consistent validation rules across the entire application.
 */
import { z } from "zod";

// ─── CAD File Constants ───────────────────────────────────────────────
/** Allowed CAD file extensions (lowercase, with dot prefix) */
export const ALLOWED_CAD_EXTENSIONS = [
  ".stl", ".step", ".stp", ".dxf", ".igs", ".iges",
  ".obj", ".3mf", ".ply", ".ifc", ".dwg", ".svg", ".f3d"
] as const;

/** Human-readable list for error messages */
export const ALLOWED_EXTENSIONS_DISPLAY = ALLOWED_CAD_EXTENSIONS.join(", ");

/** Maximum file size in bytes: 200 MB */
export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

/** Maximum file size for display */
export const MAX_FILE_SIZE_DISPLAY = "200 MB";

// ─── MIME type mapping for CAD files ──────────────────────────────────
export const CAD_MIME_TYPES: Record<string, string> = {
  ".stl": "model/stl",
  ".step": "model/step",
  ".stp": "model/step",
  ".dxf": "image/vnd.dxf",
  ".igs": "model/iges",
  ".iges": "model/iges",
};

// ─── Validation Functions ─────────────────────────────────────────────

/**
 * Check if a filename has a valid CAD file extension.
 * Case-insensitive comparison.
 */
export function isValidCadExtension(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ALLOWED_CAD_EXTENSIONS.includes(ext as typeof ALLOWED_CAD_EXTENSIONS[number]);
}

/**
 * Get the lowercase file extension including the dot.
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validate a CAD file (extension + size). Returns an error message or null.
 */
export function validateCadFile(filename: string, sizeBytes: number): string | null {
  if (!isValidCadExtension(filename)) {
    return `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS_DISPLAY}`;
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `File exceeds maximum size of ${MAX_FILE_SIZE_DISPLAY}`;
  }
  return null;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────

/** Email validation: must be valid email, max 255 chars */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be 255 characters or less")
  .transform((v) => v.toLowerCase().trim());

/** Password validation: 8-128 chars */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or less");

/** Registration request body */
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: emailSchema,
  password: passwordSchema,
}).strict();

/** Login request body */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict();

/** File upload validation (metadata) */
export const uploadFileSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z.number().max(MAX_FILE_SIZE_BYTES, `File too large (max ${MAX_FILE_SIZE_DISPLAY})`),
}).refine((data) => isValidCadExtension(data.filename), {
  message: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS_DISPLAY}`,
  path: ["filename"],
});

/** Folder creation */
export const createFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  parentId: z.string().uuid().optional().nullable(),
});

/** File update (rename, move, tags) */
export const updateFileSchema = z.object({
  filename: z.string().min(1).max(255).trim().optional(),
  folderId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

/** Comment creation */
export const createCommentSchema = z.object({
  body: z.string().min(1).max(2000).trim(),
});

/** File sharing */
export const shareFileSchema = z.object({
  fileId: z.string().uuid(),
  sharedWithEmail: z.string().email().max(255).toLowerCase().trim(),
  permission: z.enum(['VIEWER', 'EDITOR']),
});

/** UUID param validation — prevents SQL injection via URL params */
export const uuidSchema = z.string().uuid();
