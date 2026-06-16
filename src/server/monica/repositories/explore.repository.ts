import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { buildPagination, normalizePagination, readStringFilter, type MonicaPagedRequest } from '../types/pagination';
import { buildStoredImageUrl } from '../utils/image-url';

export type ExploreSort = 'newest' | 'most_liked' | 'featured';
type PublicImageFilters = {
  keyword?: string;
  themeId?: string;
};

export class ExploreRepository {
  async listPublicImages(sort: ExploreSort = 'newest') {
    const orderBy =
      sort === 'most_liked'
        ? [{ likeCount: 'desc' as const }, { publishedAt: 'desc' as const }]
        : sort === 'featured'
          ? [{ featuredScore: 'desc' as const }, { publishedAt: 'desc' as const }]
          : [{ publishedAt: 'desc' as const }];

    const publicImages = await prisma.publicImage.findMany({
      where: {
        deleted: 0,
      },
      orderBy,
      take: 80,
    });

    const imageIds = publicImages.map((publicImage) => publicImage.imageId);
    const images = imageIds.length
      ? await prisma.generatedImage.findMany({
          where: {
            imageId: { in: imageIds },
            deleted: 0,
          },
        })
      : [];
    const imageById = new Map(images.map((image) => [image.imageId, image]));

    return publicImages.map((publicImage) => {
      const image = imageById.get(publicImage.imageId);
      const imageUrl = image ? buildStoredImageUrl(image) : null;
      return {
        ...publicImage,
        image: image
          ? {
              ...image,
              imageUrl,
              thumbnailUrl: imageUrl,
            }
          : null,
      };
    });
  }

  async searchPublicImages(input: MonicaPagedRequest<PublicImageFilters>) {
    const sort = input.sortBy === 'most_liked' || input.sortBy === 'featured' ? input.sortBy : 'newest';
    const orderBy =
      sort === 'most_liked'
        ? [{ likeCount: 'desc' as const }, { publishedAt: 'desc' as const }]
        : sort === 'featured'
          ? [{ featuredScore: 'desc' as const }, { publishedAt: 'desc' as const }]
          : [{ publishedAt: 'desc' as const }];
    const { page, pageSize, skip } = normalizePagination(input);
    const keyword = readStringFilter(input.filters?.keyword);
    const themeIdText = readStringFilter(input.filters?.themeId);
    const themeId = /^\d+$/.test(themeIdText) ? BigInt(themeIdText) : undefined;
    const where: Prisma.PublicImageWhereInput = {
      deleted: 0,
      ...(themeId ? { themeId } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { altText: { contains: keyword, mode: 'insensitive' } },
              { creationNote: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [publicImages, total] = await prisma.$transaction([
      prisma.publicImage.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.publicImage.count({ where }),
    ]);

    const imageIds = publicImages.map((publicImage) => publicImage.imageId);
    const images = imageIds.length
      ? await prisma.generatedImage.findMany({
          where: { imageId: { in: imageIds }, deleted: 0 },
        })
      : [];
    const imageById = new Map(images.map((image) => [image.imageId, image]));

    return {
      items: publicImages.map((publicImage) => {
        const image = imageById.get(publicImage.imageId);
        const imageUrl = image ? buildStoredImageUrl(image) : null;
        return {
          ...publicImage,
          image: image ? { ...image, imageUrl, thumbnailUrl: imageUrl } : null,
        };
      }),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  async toggleLike(userId: string, publicImageId: string) {
    return prisma.$transaction(async (tx) => {
      const publicImage = await tx.publicImage.findFirst({
        where: {
          publicImageId,
          deleted: 0,
        },
        select: { id: true },
      });
      if (!publicImage) {
        throw new Error('Public image not found');
      }

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
      const publicImage = await tx.publicImage.findFirst({
        where: {
          publicImageId,
          deleted: 0,
        },
        select: { id: true },
      });
      if (!publicImage) {
        throw new Error('Public image not found');
      }

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
