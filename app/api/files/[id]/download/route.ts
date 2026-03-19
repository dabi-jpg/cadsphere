import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { uuidSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { dbUser } = await requireAuth();
    const { id } = await params;

    // Validate UUID param
    if (!uuidSchema.safeParse(id).success) {
      throw new ApiError('Invalid file ID', 'VALIDATION_ERROR', 400);
    }

    // Find file and verify ownership
    const file = await prisma.file.findUnique({
      where: { id, userId: dbUser.id },
    });

    if (!file) {
      throw new ApiError("File not found", "NOT_FOUND", 404);
    }

    // Fetch the file from Supabase Storage using admin client
    const { data, error } = await supabaseAdmin.storage
      .from("cad-files")
      .download(file.storagePath);

    if (error || !data) {
      console.error("Storage download error:", error);
      throw new ApiError("Failed to download file", "STORAGE_ERROR", 500);
    }

    // Create the response with the file blob
    const response = new NextResponse(data);

    // Set headers to force download with the original filename
    response.headers.set("Content-Disposition", `attachment; filename="${file.filename}"`);
    response.headers.set("Content-Type", file.filetype === ".stl" ? "model/stl" : "application/octet-stream");

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
