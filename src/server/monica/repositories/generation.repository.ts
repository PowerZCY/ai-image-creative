import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { GENERATION_STATUS, TERMINAL_GENERATION_STATUSES } from '../constants/generation';
import type { CreateGenerationJobInput, ImageGenerationProviderResult } from '../types/generation';
import { buildStoredImageUrl } from '../utils/image-url';

type Tx = Prisma.TransactionClient;
type Client = typeof prisma | Tx;

function mapGeneratedImageForApi<T extends { sourceImageUrl?: string | null; cdnImagePrefix?: string | null; storageKey?: string | null }>(image: T) {
  const imageUrl = buildStoredImageUrl(image);
  return {
    ...image,
    imageUrl,
    thumbnailUrl: imageUrl,
  };
}

function mapReferenceImageForApi<T extends { referenceId: string; cdnImagePrefix?: string | null; storageKey: string; mimeType?: string | null; safetyStatus?: string | null }>(image: T) {
  return {
    referenceId: image.referenceId,
    url: buildStoredImageUrl(image),
    mimeType: image.mimeType,
    safetyStatus: image.safetyStatus ?? undefined,
  };
}

export class GenerationRepository {
  createJob(client: Client, userId: string, input: CreateGenerationJobInput, estimatedCredits: number) {
    return client.generationJob.create({
      data: {
        userId,
        themeId: input.themeId,
        sourcePage: input.sourcePage,
        status: GENERATION_STATUS.QUEUED,
        generationType: input.generationType,
        prompt: input.prompt,
        model: input.model,
        style: input.style,
        ratio: input.ratio,
        imageCount: input.imageCount,
        estimatedCredits,
        chargedCredits: 0,
      },
    });
  }

  async createJobReferenceImages(client: Client, jobId: string, referenceIds: string[]) {
    if (referenceIds.length === 0) {
      return;
    }

    await client.generationJobReferenceImage.createMany({
      data: referenceIds.map((referenceId, position) => ({
        jobId,
        referenceId,
        position,
      })),
    });
  }

  async getReferenceImagesForJob(jobId: string) {
    const rows = await prisma.generationJobReferenceImage.findMany({
      where: { jobId },
      orderBy: { position: 'asc' },
    });

    if (rows.length === 0) {
      return [];
    }

    const referenceIds = rows.map((row) => row.referenceId);
    const referenceImages = await prisma.referenceImage.findMany({
      where: {
        referenceId: { in: referenceIds },
        deleted: 0,
      },
    });
    const referenceImagesById = new Map(referenceImages.map((image) => [image.referenceId, image]));

    return rows
      .map((row) => {
        const referenceImage = referenceImagesById.get(row.referenceId);
        return referenceImage ? { ...mapReferenceImageForApi(referenceImage), position: row.position } : null;
      })
      .filter((image): image is NonNullable<typeof image> => Boolean(image));
  }

  async getReferenceIdsForJob(jobId: string) {
    const rows = await prisma.generationJobReferenceImage.findMany({
      where: { jobId },
      orderBy: { position: 'asc' },
      select: { referenceId: true },
    });

    return rows.map((row) => row.referenceId);
  }

  async getJobForOwner(userId: string, jobId: string) {
    const job = await prisma.generationJob.findFirst({
      where: {
        jobId,
        userId,
        deleted: 0,
      },
    });
    if (!job) return null;

    const images = await prisma.generatedImage.findMany({
      where: { jobId, deleted: 0 },
      orderBy: [{ providerImageIndex: 'asc' }, { createdAt: 'asc' }],
    });
    const referenceImages = await this.getReferenceImagesForJob(jobId);

    return {
      ...job,
      images: images.map(mapGeneratedImageForApi),
      referenceImages,
    };
  }

  async getJobForWorker(jobId: string) {
    const job = await prisma.generationJob.findFirst({
      where: {
        jobId,
        deleted: 0,
      },
    });
    if (!job) return null;

    const images = await prisma.generatedImage.findMany({
      where: { jobId, deleted: 0 },
      orderBy: [{ providerImageIndex: 'asc' }, { createdAt: 'asc' }],
    });
    const referenceIds = await this.getReferenceIdsForJob(jobId);

    return {
      ...job,
      images,
      referenceIds,
    };
  }

  markQueuePublishFailed(jobId: string, failureMessage: string) {
    return prisma.generationJob.update({
      where: { jobId },
      data: {
        status: GENERATION_STATUS.FAILED,
        chargedCredits: 0,
        failureCode: 'queue_publish_failed',
        failureMessage,
        completedAt: new Date(),
      },
    });
  }

  setQstashMessageId(_jobId: string, _qstashMessageId: string | null) {
    return Promise.resolve();
  }

  async claimQueuedJob(jobId: string, _lockedBy: string) {
    const result = await prisma.generationJob.updateMany({
      where: {
        jobId,
        status: GENERATION_STATUS.QUEUED,
        deleted: 0,
      },
      data: {
        status: GENERATION_STATUS.RUNNING,
        startedAt: new Date(),
      },
    });

    return result.count === 1;
  }

  async completeSucceeded(jobId: string, result: ImageGenerationProviderResult, estimatedCredits: number) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.generationJob.findUniqueOrThrow({ where: { jobId } });

      for (const image of result.images) {
        await tx.generatedImage.upsert({
          where: {
            jobId_providerImageIndex: {
              jobId,
              providerImageIndex: image.index,
            },
          },
          update: {
            storageKey: image.storageKey,
            cdnImagePrefix: image.cdnImagePrefix,
            sourceImageUrl: image.imageUrl,
            width: image.width,
            height: image.height,
            metadata: (image.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            status: 'generated',
            isLocked: false,
            safetyStatus: 'skipped',
          },
          create: {
            jobId,
            providerImageIndex: image.index,
            userId: job.userId,
            status: 'generated',
            isLocked: false,
            storageKey: image.storageKey,
            cdnImagePrefix: image.cdnImagePrefix,
            sourceImageUrl: image.imageUrl,
            width: image.width,
            height: image.height,
            safetyStatus: 'skipped',
            metadata: (image.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        });
      }

      return tx.generationJob.update({
        where: { jobId },
        data: {
          status: GENERATION_STATUS.SUCCEEDED,
          chargedCredits: estimatedCredits,
          completedAt: new Date(),
          failureCode: null,
          failureMessage: null,
        },
      });
    });
  }

  markFailed(jobId: string, failureCode: string, failureMessage: string) {
    return prisma.generationJob.update({
      where: { jobId },
      data: {
        status: GENERATION_STATUS.FAILED,
        chargedCredits: 0,
        failureCode,
        failureMessage,
        completedAt: new Date(),
      },
    });
  }

  markBlocked(jobId: string, failureCode: string, failureMessage: string) {
    return prisma.generationJob.update({
      where: { jobId },
      data: {
        status: GENERATION_STATUS.BLOCKED,
        chargedCredits: 0,
        failureCode,
        failureMessage,
        completedAt: new Date(),
      },
    });
  }

  isTerminalStatus(status: string) {
    return TERMINAL_GENERATION_STATUSES.has(status);
  }
}

export const generationRepository = new GenerationRepository();
