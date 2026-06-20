import { prisma } from '@/server/prisma';

export type SetThemeFeaturedImagesInput = {
  themeId: bigint;
  publicImageIds: bigint[];
  createdBy?: string | null;
};

export class ThemeFeaturedImageRepository {
  listByTheme(themeId: bigint) {
    return prisma.themeFeaturedImage.findMany({
      where: {
        themeId,
        deleted: 0,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async setForTheme(input: SetThemeFeaturedImagesInput) {
    const publicImages = await prisma.publicImage.findMany({
      where: {
        id: { in: input.publicImageIds },
        themeId: input.themeId,
        deleted: 0,
      },
      select: { id: true },
    });
    const allowedIds = new Set(publicImages.map((image) => image.id.toString()));
    const invalidIds = input.publicImageIds.filter((id) => !allowedIds.has(id.toString()));
    if (invalidIds.length > 0) {
      throw new Error('Featured images must belong to the selected theme');
    }

    return prisma.$transaction(async (tx) => {
      await tx.themeFeaturedImage.updateMany({
        where: { themeId: input.themeId, deleted: 0 },
        data: { deleted: 1 },
      });

      for (const [index, publicImageId] of input.publicImageIds.slice(0, 3).entries()) {
        await tx.themeFeaturedImage.upsert({
          where: {
            themeId_publicImageId: {
              themeId: input.themeId,
              publicImageId,
            },
          },
          update: {
            position: index + 1,
            createdBy: input.createdBy,
            deleted: 0,
          },
          create: {
            themeId: input.themeId,
            publicImageId,
            position: index + 1,
            createdBy: input.createdBy,
          },
        });
      }

      return tx.themeFeaturedImage.findMany({
        where: { themeId: input.themeId, deleted: 0 },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }
}

export const themeFeaturedImageRepository = new ThemeFeaturedImageRepository();
