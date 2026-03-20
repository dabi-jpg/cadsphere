import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { deleteFromStorage } from '@/lib/storage'

export async function DELETE(request: Request) {
  try {
    const { dbUser, supabaseUser } = await requireAuth()

    // Delete all files from storage
    const files = await prisma.file.findMany({
      where: { userId: dbUser.id },
      include: { versions: true }
    })

    for (const file of files) {
      await deleteFromStorage(file.storagePath).catch(() => {})
      for (const version of file.versions) {
        await deleteFromStorage(version.storagePath).catch(() => {})
      }
    }

    // Delete all DB records in correct order
    await prisma.auditLog.deleteMany({ where: { userId: dbUser.id } })
    await prisma.fileComment.deleteMany({ where: { userId: dbUser.id } })
    await prisma.starredFile.deleteMany({ where: { userId: dbUser.id } })
    await prisma.sharedFile.deleteMany({
      where: {
        OR: [{ sharedById: dbUser.id }, { sharedWithId: dbUser.id }]
      }
    })
    await prisma.fileVersion.deleteMany({
      where: { file: { userId: dbUser.id } }
    })
    await prisma.file.deleteMany({ where: { userId: dbUser.id } })
    await prisma.folder.deleteMany({ where: { userId: dbUser.id } })
    await prisma.user.delete({ where: { id: dbUser.id } })

    // Delete from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(supabaseUser.id)

    return Response.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
