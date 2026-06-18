import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { buildPagination, normalizePagination, readStringFilter, type MonicaPagedRequest } from '../types/pagination';
import { buildStoredImageUrl } from '../utils/image-url';

type StudioImageFilters = {
  keyword?: string;
  status?: string;
  themeId?: string;
  locked?: string;
};

type ImageSubmissionFilters = {
  keyword?: string;
  status?: string;
  themeId?: string;
  userId?: string;
};

export class ImageRepository {
  async listStudioImages(userId: string) {
    const images = await prisma.generatedImage.findMany({
      where: {
        userId,
        deleted: 0,
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    return this.enrichGeneratedImages(images);
  }

  async searchStudioImages(userId: string, input: MonicaPagedRequest<StudioImageFilters>) {
    const { page, pageSize, skip } = normalizePagination(input);
    const status = readStringFilter(input.filters?.status);
    const locked = readStringFilter(input.filters?.locked);
    const where: Prisma.GeneratedImageWhereInput = {
      userId,
      deleted: 0,
      ...(status && status !== 'all' && status !== 'submitted'
        ? { status }
        : {}),
      ...(locked === 'locked' ? { isLocked: true } : locked === 'unlocked' ? { isLocked: false } : {}),
    };

    const [images, total] = await prisma.$transaction([
      prisma.generatedImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.generatedImage.count({ where }),
    ]);

    return {
      items: await this.enrichGeneratedImages(images),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  async searchImageSubmissions(input: MonicaPagedRequest<ImageSubmissionFilters>) {
    const { page, pageSize, skip } = normalizePagination(input);
    const keyword = readStringFilter(input.filters?.keyword);
    const status = readStringFilter(input.filters?.status);
    const themeIdText = readStringFilter(input.filters?.themeId);
    const userId = readStringFilter(input.filters?.userId);
    const themeId = /^\d+$/.test(themeIdText) ? BigInt(themeIdText) : undefined;
    const where: Prisma.ImageSubmissionWhereInput = {
      deleted: 0,
      ...(status && status !== 'all' ? { status } : {}),
      ...(themeId ? { themeId } : {}),
      ...(userId ? { userId } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { promptSnapshot: { contains: keyword, mode: 'insensitive' } },
              { creationNote: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [submissions, total] = await prisma.$transaction([
      prisma.imageSubmission.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.imageSubmission.count({ where }),
    ]);

    const imageIds = submissions.map((submission) => submission.imageId);
    const [images, publicImages, users, themes] = await Promise.all([
      imageIds.length
        ? prisma.generatedImage.findMany({ where: { imageId: { in: imageIds }, deleted: 0 } })
        : [],
      imageIds.length
        ? prisma.publicImage.findMany({ where: { imageId: { in: imageIds } } })
        : [],
      submissions.length
        ? prisma.user.findMany({
            where: { userId: { in: [...new Set(submissions.map((submission) => submission.userId))] } },
            select: { userId: true, email: true, userName: true },
          })
        : [],
      submissions.length
        ? prisma.theme.findMany({
            where: { id: { in: [...new Set(submissions.map((submission) => submission.themeId))] } },
          })
        : [],
    ]);

    const imageById = new Map(images.map((image) => [image.imageId, image]));
    const publicImageByImageId = new Map(publicImages.map((publicImage) => [publicImage.imageId, publicImage]));
    const userById = new Map(users.map((user) => [user.userId, user]));
    const themeById = new Map(themes.map((theme) => [theme.id.toString(), theme]));

    return {
      items: submissions.map((submission) => {
        const image = imageById.get(submission.imageId);
        const imageUrl = image ? buildStoredImageUrl(image) : null;
        const theme = themeById.get(submission.themeId.toString());
        return {
          ...submission,
          image: image ? { ...image, imageUrl, thumbnailUrl: imageUrl } : null,
          publicImage: publicImageByImageId.get(submission.imageId) ?? null,
          user: userById.get(submission.userId) ?? null,
          theme: theme
            ? {
                id: theme.id.toString(),
                title: theme.title,
                brief: theme.brief,
              }
            : null,
        };
      }),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  private async enrichGeneratedImages(images: Awaited<ReturnType<typeof prisma.generatedImage.findMany>>) {
    const jobIds = [...new Set(images.map((image) => image.jobId).filter((jobId): jobId is string => Boolean(jobId)))];
    const imageIds = images.map((image) => image.imageId);

    const [jobs, publicImages, submissions] = await Promise.all([
      jobIds.length
        ? prisma.generationJob.findMany({
            where: { jobId: { in: jobIds }, deleted: 0 },
            select: {
              jobId: true,
              themeId: true,
              prompt: true,
              model: true,
              style: true,
              ratio: true,
            },
          })
        : [],
      imageIds.length ? prisma.publicImage.findMany({ where: { imageId: { in: imageIds }, deleted: 0 } }) : [],
      imageIds.length
        ? prisma.imageSubmission.findMany({
            where: { imageId: { in: imageIds }, deleted: 0 },
            orderBy: { submittedAt: 'desc' },
          })
        : [],
    ]);
    const themeIds = [...new Set(jobs.map((job) => job.themeId).filter((themeId): themeId is bigint => Boolean(themeId)))];
    const themes = themeIds.length
      ? await prisma.theme.findMany({
          where: { id: { in: themeIds }, deleted: 0 },
          select: { id: true, title: true, brief: true },
        })
      : [];

    const jobById = new Map(jobs.map((job) => [job.jobId, job]));
    const themeById = new Map(themes.map((theme) => [theme.id.toString(), theme]));
    const publicImageByImageId = new Map(publicImages.map((publicImage) => [publicImage.imageId, publicImage]));
    const latestSubmissionByImageId = new Map<string, (typeof submissions)[number]>();
    for (const submission of submissions) {
      if (!latestSubmissionByImageId.has(submission.imageId)) {
        latestSubmissionByImageId.set(submission.imageId, submission);
      }
    }

    return images.map((image) => {
      const job = image.jobId ? jobById.get(image.jobId) : null;
      const theme = job?.themeId ? themeById.get(job.themeId.toString()) : null;
      const imageUrl = buildStoredImageUrl(image);
      return {
        ...image,
        imageUrl,
        thumbnailUrl: imageUrl,
        promptUsed: job?.prompt ?? null,
        model: job?.model ?? null,
        style: job?.style ?? null,
        ratio: job?.ratio ?? null,
        themeId: job?.themeId?.toString() ?? null,
        theme: theme ? { id: theme.id.toString(), title: theme.title, brief: theme.brief } : null,
        publicImage: publicImageByImageId.get(image.imageId) ?? null,
        submissions: latestSubmissionByImageId.has(image.imageId)
          ? [latestSubmissionByImageId.get(image.imageId)]
          : [],
      };
    });
  }

  findOwnedGeneratedImage(userId: string, imageId: string) {
    return prisma.generatedImage.findFirst({
      where: {
        imageId,
        userId,
        deleted: 0,
      },
    });
  }

  findGenerationJob(jobId: string) {
    return prisma.generationJob.findFirst({
      where: {
        jobId,
        deleted: 0,
      },
    });
  }
}

export const imageRepository = new ImageRepository();
