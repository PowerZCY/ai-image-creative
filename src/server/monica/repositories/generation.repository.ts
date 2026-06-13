import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { GENERATION_STATUS, TERMINAL_GENERATION_STATUSES } from '../constants/generation';
import type { CreateGenerationJobInput, ImageGenerationProviderResult } from '../types/generation';

type Tx = Prisma.TransactionClient;
type Client = typeof prisma | Tx;

export class GenerationRepository {
  createJob(client: Client, userId: string, input: CreateGenerationJobInput, estimatedCredits: number) {
    return client.generationJob.create({
      data: {
        userId,
        sessionId: input.sessionId,
        themeId: input.themeId,
        referenceId: input.referenceId,
        sourceImageId: input.sourceImageId,
        sourcePage: input.sourcePage,
        status: GENERATION_STATUS.QUEUED,
        generationType: input.generationType,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        editInstruction: input.editInstruction,
        model: input.model,
        style: input.style,
        ratio: input.ratio,
        imageCount: input.imageCount,
        estimatedCredits,
        chargedCredits: 0,
      },
    });
  }

  getJobForOwner(userId: string, jobId: string) {
    return prisma.generationJob.findFirst({
      where: {
        jobId,
        userId,
        deleted: 0,
      },
      include: {
        images: {
          where: { deleted: 0 },
          orderBy: [{ providerImageIndex: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  getJobForWorker(jobId: string) {
    return prisma.generationJob.findFirst({
      where: {
        jobId,
        deleted: 0,
      },
      include: {
        images: {
          where: { deleted: 0 },
          orderBy: [{ providerImageIndex: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
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

  setQstashMessageId(jobId: string, qstashMessageId: string | null) {
    return prisma.generationJob.update({
      where: { jobId },
      data: {
        qstashMessageId,
      },
    });
  }

  async claimQueuedJob(jobId: string, lockedBy: string) {
    const result = await prisma.generationJob.updateMany({
      where: {
        jobId,
        status: GENERATION_STATUS.QUEUED,
        deleted: 0,
      },
      data: {
        status: GENERATION_STATUS.RUNNING,
        lockedAt: new Date(),
        lockedBy,
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
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl ?? image.imageUrl,
            width: image.width,
            height: image.height,
            metadata: (image.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            status: 'generated',
            safetyStatus: 'skipped',
          },
          create: {
            jobId,
            providerImageIndex: image.index,
            userId: job.userId,
            themeId: job.themeId,
            status: 'generated',
            storageKey: image.storageKey,
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl ?? image.imageUrl,
            width: image.width,
            height: image.height,
            promptUsed: undefined,
            model: undefined,
            style: undefined,
            ratio: undefined,
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
          provider: result.provider,
          providerJobId: result.providerJobId,
          providerResponse: (result.responseSummary ?? Prisma.JsonNull) as Prisma.InputJsonValue,
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
