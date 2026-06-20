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

    return this.enrichPublicImages(publicImages);
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

    return {
      items: await this.enrichPublicImages(publicImages),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  private async enrichPublicImages(publicImages: Awaited<ReturnType<typeof prisma.publicImage.findMany>>) {
    const imageIds = publicImages.map((publicImage) => publicImage.imageId);
    const themeIds = [...new Set(publicImages.map((publicImage) => publicImage.themeId).filter((themeId): themeId is bigint => Boolean(themeId)))];
    const userIds = [...new Set(publicImages.map((publicImage) => publicImage.userId))];
    const images = imageIds.length
      ? await prisma.generatedImage.findMany({
          where: { imageId: { in: imageIds }, deleted: 0 },
        })
      : [];
    const jobIds = [...new Set(images.map((image) => image.jobId).filter((jobId): jobId is string => Boolean(jobId)))];
    const [jobs, themes, users] = await Promise.all([
      jobIds.length
        ? prisma.generationJob.findMany({
            where: { jobId: { in: jobIds }, deleted: 0 },
            select: { jobId: true, prompt: true, model: true, style: true, ratio: true },
          })
        : [],
      themeIds.length
        ? prisma.theme.findMany({
            where: { id: { in: themeIds }, deleted: 0 },
            select: { id: true, title: true, brief: true },
          })
        : [],
      userIds.length
        ? prisma.user.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, userName: true, email: true },
          })
        : [],
    ]);
    const imageById = new Map(images.map((image) => [image.imageId, image]));
    const jobById = new Map(jobs.map((job) => [job.jobId, job]));
    const themeById = new Map(themes.map((theme) => [theme.id.toString(), theme]));
    const userById = new Map(users.map((user) => [user.userId, user]));

    return publicImages.map((publicImage) => {
      const image = imageById.get(publicImage.imageId);
      const job = image?.jobId ? jobById.get(image.jobId) : null;
      const imageUrl = image ? buildStoredImageUrl(image) : null;
      const theme = publicImage.themeId ? themeById.get(publicImage.themeId.toString()) : null;
      const user = userById.get(publicImage.userId);
      return {
        ...publicImage,
        promptUsed: job?.prompt ?? null,
        model: job?.model ?? null,
        style: job?.style ?? null,
        ratio: job?.ratio ?? null,
        theme: theme ? { id: theme.id.toString(), title: theme.title, brief: theme.brief } : null,
        author: user ? { userName: user.userName, email: user.email } : null,
        image: image ? { ...image, imageUrl, thumbnailUrl: imageUrl } : null,
      };
    });
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
