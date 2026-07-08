import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';

export type CreateAdminImageUploadInput = {
  adminUserId: string;
  themeId: bigint;
  storageKey: string;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  title: string;
  altText?: string | null;
  creationNote?: string | null;
  prompt?: string | null;
  tags?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

export class AdminImageUploadRepository {
  createPublishedWithPublicImage(input: CreateAdminImageUploadInput) {
    return prisma.$transaction(async (tx) => {
      const upload = await tx.adminImageUpload.create({
        data: {
          adminUserId: input.adminUserId,
          themeId: input.themeId,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          width: input.width,
          height: input.height,
          title: input.title,
          altText: input.altText,
          creationNote: input.creationNote,
          prompt: input.prompt,
          tags: input.tags ?? Prisma.JsonNull,
          metadata: input.metadata ?? Prisma.JsonNull,
          status: 'published',
        },
      });

      const publicImage = await tx.publicImage.create({
        data: {
          imageId: upload.imageId,
          imageSource: 'admin_upload',
          sourceType: 'admin_upload',
          createdBy: input.adminUserId,
          userId: input.adminUserId,
          themeId: input.themeId,
          title: input.title,
          altText: input.altText,
          creationNote: input.creationNote,
          promptPublic: true,
          tags: input.tags ?? Prisma.JsonNull,
        },
      });

      return { upload, publicImage };
    });
  }
}

export const adminImageUploadRepository = new AdminImageUploadRepository();
