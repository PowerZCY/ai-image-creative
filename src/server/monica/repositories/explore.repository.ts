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

  async findPublicImageDetail(publicImageId: string) {
    const publicImage = await prisma.publicImage.findFirst({
      where: {
        publicImageId,
        deleted: 0,
      },
    });

    if (!publicImage) return null;
    const [detail] = await this.enrichPublicImages([publicImage]);
    return detail ?? null;
  }

  private async enrichPublicImages(publicImages: Awaited<ReturnType<typeof prisma.publicImage.findMany>>) {
    const generatedImageIds = publicImages
      .filter((publicImage) => publicImage.imageSource !== 'admin_upload')
      .map((publicImage) => publicImage.imageId);
    const adminUploadImageIds = publicImages
      .filter((publicImage) => publicImage.imageSource === 'admin_upload')
      .map((publicImage) => publicImage.imageId);
    const themeIds = [...new Set(publicImages.map((publicImage) => publicImage.themeId).filter((themeId): themeId is bigint => Boolean(themeId)))];
    const [images, adminUploads] = await Promise.all([
      generatedImageIds.length
        ? prisma.generatedImage.findMany({
            where: { imageId: { in: generatedImageIds }, deleted: 0 },
          })
        : [],
      adminUploadImageIds.length
        ? prisma.adminImageUpload.findMany({
            where: { imageId: { in: adminUploadImageIds }, deleted: 0 },
          })
        : [],
    ]);
    const jobIds = [...new Set(images.map((image) => image.jobId).filter((jobId): jobId is string => Boolean(jobId)))];
    const [jobs, themes] = await Promise.all([
      jobIds.length
        ? prisma.generationJob.findMany({
            where: { jobId: { in: jobIds }, deleted: 0 },
            select: { jobId: true, prompt: true },
          })
        : [],
      themeIds.length
        ? prisma.theme.findMany({
            where: { id: { in: themeIds }, deleted: 0 },
            select: { id: true, title: true, brief: true },
          })
        : [],
    ]);
    const imageById = new Map(images.map((image) => [image.imageId, image]));
    const adminUploadByImageId = new Map(adminUploads.map((upload) => [upload.imageId, upload]));
    const jobById = new Map(jobs.map((job) => [job.jobId, job]));
    const themeById = new Map(themes.map((theme) => [theme.id.toString(), theme]));

    return publicImages.map((publicImage) => {
      const isAdminUpload = publicImage.imageSource === 'admin_upload';
      const image = isAdminUpload ? null : imageById.get(publicImage.imageId);
      const adminUpload = isAdminUpload ? adminUploadByImageId.get(publicImage.imageId) : null;
      const job = image?.jobId ? jobById.get(image.jobId) : null;
      const imageUrl = adminUpload ? buildStoredImageUrl(adminUpload) : image ? buildStoredImageUrl(image) : null;
      const theme = publicImage.themeId ? themeById.get(publicImage.themeId.toString()) : null;
      const promptUsed = publicImage.promptPublic
        ? adminUpload?.prompt ?? job?.prompt ?? null
        : null;
      const width = adminUpload?.width ?? image?.width ?? null;
      const height = adminUpload?.height ?? image?.height ?? null;
      return {
        publicImageId: publicImage.publicImageId,
        title: publicImage.title,
        altText: publicImage.altText,
        creationNote: publicImage.creationNote,
        promptUsed,
        likeCount: publicImage.likeCount,
        saveCount: publicImage.saveCount,
        theme: theme ? { id: theme.id.toString(), title: theme.title, brief: theme.brief } : null,
        image: image || adminUpload
          ? {
              imageId: publicImage.imageId,
              imageUrl,
              thumbnailUrl: imageUrl,
              width,
              height,
            }
          : null,
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
