import { prisma } from '@/server/prisma';

export type SetThemeFeaturedImagesInput = {
  themeId: bigint;
  publicImageIds: string[];
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
        publicImageId: { in: input.publicImageIds },
        themeId: input.themeId,
        deleted: 0,
      },
      select: { publicImageId: true },
    });
    const allowedIds = new Set(publicImages.map((image) => image.publicImageId));
    const invalidIds = input.publicImageIds.filter((id) => !allowedIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error('Featured images must belong to the selected theme');
    }

    return prisma.$transaction(async (tx) => {
      await tx.themeFeaturedImage.deleteMany({
        where: { themeId: input.themeId },
      });

      for (const [index, publicImageId] of input.publicImageIds.slice(0, 3).entries()) {
        await tx.themeFeaturedImage.create({
          data: {
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
