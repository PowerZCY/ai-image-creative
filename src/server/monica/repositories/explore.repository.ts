import { prisma } from '@/server/prisma';

export type ExploreSort = 'newest' | 'most_liked' | 'featured';

export class ExploreRepository {
  listPublicImages(sort: ExploreSort = 'newest') {
    const orderBy =
      sort === 'most_liked'
        ? [{ likeCount: 'desc' as const }, { publishedAt: 'desc' as const }]
        : sort === 'featured'
          ? [{ featuredScore: 'desc' as const }, { publishedAt: 'desc' as const }]
          : [{ publishedAt: 'desc' as const }];

    return prisma.publicImage.findMany({
      where: {
        status: 'published',
        deleted: 0,
      },
      include: {
        image: true,
      },
      orderBy,
      take: 80,
    });
  }

  async toggleLike(userId: string, publicImageId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.imageLike.findUnique({
        where: {
          publicImageId_userId: {
            publicImageId,
            userId,
          },
        },
      });

      if (existing && existing.deleted === 0) {
        await tx.imageLike.update({
          where: { id: existing.id },
          data: { deleted: 1 },
        });
        await tx.publicImage.update({
          where: { publicImageId },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false };
      }

      if (existing) {
        await tx.imageLike.update({
          where: { id: existing.id },
          data: { deleted: 0 },
        });
      } else {
        await tx.imageLike.create({
          data: { publicImageId, userId },
        });
      }

      await tx.publicImage.update({
        where: { publicImageId },
        data: { likeCount: { increment: 1 } },
      });
      return { liked: true };
    });
  }

  async toggleSave(userId: string, publicImageId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.imageSave.findUnique({
        where: {
          publicImageId_userId: {
            publicImageId,
            userId,
          },
        },
      });

      if (existing && existing.deleted === 0) {
        await tx.imageSave.update({
          where: { id: existing.id },
          data: { deleted: 1 },
        });
        await tx.publicImage.update({
          where: { publicImageId },
          data: { saveCount: { decrement: 1 } },
        });
        return { saved: false };
      }

      if (existing) {
        await tx.imageSave.update({
          where: { id: existing.id },
          data: { deleted: 0 },
        });
      } else {
        await tx.imageSave.create({
          data: { publicImageId, userId },
        });
      }

      await tx.publicImage.update({
        where: { publicImageId },
        data: { saveCount: { increment: 1 } },
      });
      return { saved: true };
    });
  }
}

export const exploreRepository = new ExploreRepository();
