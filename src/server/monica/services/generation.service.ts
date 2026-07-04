import { prisma } from '@/server/prisma';
import {
  acquireLock,
  publishFIFOQueueMessage,
  releaseLock,
  type QstashEnvelope,
} from '@windrun-huaiin/backend-core/upstash/server';
import { GENERATION_QUEUE_NAME, GENERATION_STATUS, GENERATION_TYPE } from '../constants/generation';
import { SAFETY_STATUS } from '../constants/safety';
import { getImageGenerationProvider } from '../ai/image-generation-provider.factory';
import { generationRepository } from '../repositories/generation.repository';
import type { CreateGenerationJobInput, QstashGenerationPayload } from '../types/generation';
import { generationCreditService } from './generation-credit.service';
import { referenceImageService } from './reference-image.service';
import { safetyService } from './safety.service';
import { r2StorageService } from '../storage/r2-storage.service';

const CREATE_GENERATION_LOCK_TTL_MS = 15_000;
const PUBLIC_GENERATION_FAILED_MESSAGE = 'Image generation failed. Credits were not used. Please try again in a moment.';
const GENERATION_DISPATCH_MODE = {
  QUEUE: 'queue',
  CLIENT_RUN: 'client-run',
  INLINE: 'inline',
} as const;

function extensionFromMimeType(mimeType?: string) {
  const clean = mimeType?.split(';')[0].trim().toLowerCase();
  if (clean === 'image/png') return 'png';
  if (clean === 'image/webp') return 'webp';
  if (clean === 'image/gif') return 'gif';
  if (clean === 'image/jpeg' || clean === 'image/jpg') return 'jpg';
  return 'png';
}

function createGeneratedImageStorageKey(input: {
  jobId: string;
  index: number;
  mimeType?: string;
}) {
  const extension = extensionFromMimeType(input.mimeType);
  return `ai/${input.jobId}/${input.index}.${extension}`;
}

function safeJsonStringify(value: unknown) {
  return JSON.stringify(value, (_key, nestedValue) => (
    typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue
  ));
}

function truncateForLog(value: string, maxLength = 8000) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function compactStack(stack?: string, maxLength = 1200) {
  if (!stack) return undefined;
  return truncateForLog(stack, maxLength);
}

class GenerationPipelineError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly details: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'GenerationPipelineError';
  }
}

function serializeErrorCause(error: unknown, depth = 0): unknown {
  if (depth > 3) return '[cause depth limit reached]';
  if (!error || typeof error !== 'object' || !('cause' in error)) return undefined;
  const cause = (error as { cause?: unknown }).cause;
  if (!cause) return undefined;
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      ...('code' in cause ? { code: (cause as { code?: unknown }).code } : {}),
      ...('errno' in cause ? { errno: (cause as { errno?: unknown }).errno } : {}),
      ...('syscall' in cause ? { syscall: (cause as { syscall?: unknown }).syscall } : {}),
      ...('hostname' in cause ? { hostname: (cause as { hostname?: unknown }).hostname } : {}),
      cause: serializeErrorCause(cause, depth + 1),
      stack: compactStack(cause.stack),
    };
  }
  return cause;
}

function serializeGenerationError(error: unknown) {
  const pipelineError = error instanceof GenerationPipelineError ? error : null;
  return {
    stage: pipelineError?.stage ?? 'generation.run',
    errorName: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorCause: serializeErrorCause(error),
    details: pipelineError?.details,
    errorStack: error instanceof Error ? compactStack(error.stack) : undefined,
  };
}

export type GenerationDispatchMode = (typeof GENERATION_DISPATCH_MODE)[keyof typeof GENERATION_DISPATCH_MODE];

export type CreateGenerationJobResult = {
  job: Awaited<ReturnType<typeof generationRepository.getJobForOwner>>;
  dispatchMode: GenerationDispatchMode;
  runUrl?: string;
};

export class GenerationService {
  private async logGenerationFailure(input: {
    job: NonNullable<Awaited<ReturnType<typeof generationRepository.getJobForWorker>>>;
    error: unknown;
  }) {
    const { job, error } = input;
    const errorSummary = serializeGenerationError(error);
    const requestSummary = {
      jobId: job.jobId,
      userId: job.userId,
      model: job.model,
      ratio: job.ratio,
      imageCount: job.imageCount,
      referenceId: job.referenceId,
      hasReferenceImage: Boolean(job.referenceId),
      provider: 'openrouter',
    };

    console.error('[monica/generation] generation failed', {
      ...requestSummary,
      ...errorSummary,
    });

    try {
      await prisma.apilog.create({
        data: {
          apiType: 'monica_generation',
          methodName: errorSummary.stage,
          summary: 'generation failed',
          request: truncateForLog(safeJsonStringify(requestSummary)),
          response: truncateForLog(safeJsonStringify(errorSummary)),
        },
      });
    } catch (logError) {
      console.error('[monica/generation] failed to persist generation failure log', {
        jobId: job.jobId,
        errorMessage: logError instanceof Error ? logError.message : String(logError),
      });
    }
  }

  async createGenerationJob(userId: string, input: CreateGenerationJobInput): Promise<CreateGenerationJobResult> {
    const lockKey = `monica:generation:${userId}`;
    const lockToken = await acquireLock(lockKey, CREATE_GENERATION_LOCK_TTL_MS);
    if (!lockToken) {
      throw new Error('Generation request is already in progress');
    }

    try {
      return await this.createGenerationJobWithLock(userId, input);
    } finally {
      await releaseLock(lockKey, lockToken);
    }
  }

  private async createGenerationJobWithLock(userId: string, input: CreateGenerationJobInput): Promise<CreateGenerationJobResult> {
    const mode = this.getDispatchMode();
    const job = await this.createQueuedGenerationJobWithCredits(userId, input);

    if (mode === GENERATION_DISPATCH_MODE.INLINE) {
      await this.runGenerationJob(job.jobId, 'inline');
      return {
        job: await generationRepository.getJobForOwner(userId, job.jobId),
        dispatchMode: mode,
      };
    }

    if (mode === GENERATION_DISPATCH_MODE.CLIENT_RUN) {
      return {
        job: await generationRepository.getJobForOwner(userId, job.jobId),
        dispatchMode: mode,
        runUrl: `/api/monica/generation/jobs/${job.jobId}/run`,
      };
    }

    await this.publishGenerationJob(userId, job.jobId, job.estimatedCredits);

    return {
      job: await generationRepository.getJobForOwner(userId, job.jobId),
      dispatchMode: mode,
    };
  }

  private async createQueuedGenerationJobWithCredits(userId: string, input: CreateGenerationJobInput) {
    await referenceImageService.assertOwnedReferenceImage(userId, input.referenceId);

    const generationType = input.generationType ?? GENERATION_TYPE.TEXT_TO_IMAGE;
    const estimatedCredits = generationCreditService.estimateCredits({
      imageCount: input.imageCount,
      generationType,
    });

    const job = await prisma.$transaction(async (tx) => {
      const created = await generationRepository.createJob(
        tx,
        userId,
        { ...input, generationType },
        estimatedCredits,
      );

      await generationCreditService.consumeForJob(
        userId,
        created.jobId,
        estimatedCredits,
        generationType,
        tx,
      );

      return created;
    });

    return job;
  }

  private async publishGenerationJob(userId: string, jobId: string, estimatedCredits: number) {
    try {
      const publishResult = await publishFIFOQueueMessage<QstashGenerationPayload>({
        queueName: GENERATION_QUEUE_NAME,
        url: this.getWorkerUrl(),
        body: { jobId },
      });

      if (!publishResult) {
        throw new Error('QStash publish returned null');
      }

      await generationRepository.setQstashMessageId(jobId, publishResult.messageId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await generationRepository.markQueuePublishFailed(jobId, message);
      await generationCreditService.refundForJob(userId, jobId, estimatedCredits, 'queue_publish_failed');
      throw error;
    }
  }

  async getGenerationJob(userId: string, jobId: string) {
    return generationRepository.getJobForOwner(userId, jobId);
  }

  async runOwnedGenerationJob(userId: string, jobId: string) {
    const ownedJob = await generationRepository.getJobForOwner(userId, jobId);
    if (!ownedJob) {
      throw new Error('Generation job not found');
    }

    await this.runGenerationJob(jobId, 'client-run');
    return generationRepository.getJobForOwner(userId, jobId);
  }

  private async persistProviderImagesToR2(input: {
    jobId: string;
    model: string;
    providerResult: Awaited<ReturnType<ReturnType<typeof getImageGenerationProvider>['createGeneration']>>;
  }) {
    const images = [];

    for (const image of input.providerResult.images) {
      if (!image.binaryData) {
        images.push(image);
        continue;
      }

      const contentType = image.mimeType || 'image/png';
      const storageKey = createGeneratedImageStorageKey({
        jobId: input.jobId,
        index: image.index,
        mimeType: contentType,
      });
      let uploadResult: Awaited<ReturnType<typeof r2StorageService.uploadGeneratedImage>>;
      try {
        uploadResult = await r2StorageService.uploadGeneratedImage({
          storageKey,
          body: image.binaryData,
          contentType,
        });
      } catch (error) {
        const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL;
        throw new GenerationPipelineError(
          'R2 generated image upload failed',
          'r2.uploadGeneratedImage',
          {
            jobId: input.jobId,
            model: input.model,
            provider: input.providerResult.provider,
            providerJobId: input.providerResult.providerJobId,
            imageIndex: image.index,
            storageKey,
            contentType,
            binaryByteLength: image.binaryData.byteLength,
            providerImageSource: image.metadata?.providerImageSource,
            providerSourceUrl: image.metadata?.providerSourceUrl,
            r2BaseUrl,
            r2BucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME,
            r2UploadUrl: r2BaseUrl
              ? `${r2BaseUrl.replace(/\/+$/, '')}/api/buckets/${process.env.NEXT_PUBLIC_R2_BUCKET_NAME}/${storageKey}`
              : undefined,
          },
          { cause: error },
        );
      }

      const { binaryData: _binaryData, ...safeImage } = image;
      images.push({
        ...safeImage,
        storageKey: uploadResult.storageKey,
        imageUrl: uploadResult.imageUrl,
      });
    }

    return {
      ...input.providerResult,
      images,
    };
  }

  async runGenerationJob(jobId: string, lockedBy = 'qstash') {
    const currentJob = await generationRepository.getJobForWorker(jobId);
    if (!currentJob) {
      throw new Error(`Generation job not found: ${jobId}`);
    }

    if (generationRepository.isTerminalStatus(currentJob.status)) {
      return currentJob;
    }

    const claimed = await generationRepository.claimQueuedJob(jobId, lockedBy);
    if (!claimed) {
      const latest = await generationRepository.getJobForWorker(jobId);
      if (!latest || generationRepository.isTerminalStatus(latest.status)) {
        return latest;
      }
      if (latest.status !== GENERATION_STATUS.RUNNING) {
        return latest;
      }
    }

    const job = await generationRepository.getJobForWorker(jobId);
    if (!job) {
      throw new Error(`Generation job not found after claim: ${jobId}`);
    }

    try {
      const requestSafety = await safetyService.checkGenerationRequest({
        prompt: job.prompt,
      });
      if (requestSafety.status === SAFETY_STATUS.BLOCKED) {
        await generationRepository.markBlocked(
          job.jobId,
          requestSafety.reasonCode ?? 'safety_blocked',
          'Generation request was blocked by safety policy',
        );
        await generationCreditService.refundForJob(
          job.userId,
          job.jobId,
          job.estimatedCredits,
          requestSafety.reasonCode ?? 'safety_blocked',
        );
        return generationRepository.getJobForWorker(job.jobId);
      }

      const provider = getImageGenerationProvider();
      let providerResult: Awaited<ReturnType<ReturnType<typeof getImageGenerationProvider>['createGeneration']>>;
      try {
        providerResult = await provider.createGeneration({
          jobId: job.jobId,
          prompt: job.prompt,
          model: job.model,
          style: job.style,
          ratio: job.ratio,
          imageCount: job.imageCount,
          referenceImageUrl: job.referenceId
            ? await referenceImageService.createProviderAccessibleImageUrl(job.referenceId)
            : undefined,
        });
      } catch (error) {
        throw new GenerationPipelineError(
          'OpenRouter image generation failed',
          'openrouter.createGeneration',
          {
            jobId: job.jobId,
            model: job.model,
            ratio: job.ratio,
            imageCount: job.imageCount,
            hasReferenceImage: Boolean(job.referenceId),
          },
          { cause: error },
        );
      }

      if (providerResult.images.length === 0) {
        throw new Error('Provider returned no deliverable images');
      }

      const resultSafety = await safetyService.checkProviderResult(providerResult);
      if (resultSafety.status === SAFETY_STATUS.BLOCKED) {
        await generationRepository.markBlocked(
          job.jobId,
          resultSafety.reasonCode ?? 'provider_result_blocked',
          'Provider result was blocked by safety policy',
        );
        await generationCreditService.refundForJob(
          job.userId,
          job.jobId,
          job.estimatedCredits,
          resultSafety.reasonCode ?? 'provider_result_blocked',
        );
        return generationRepository.getJobForWorker(job.jobId);
      }

      const persistedResult = await this.persistProviderImagesToR2({
        jobId: job.jobId,
        model: job.model,
        providerResult,
      });

      await generationRepository.completeSucceeded(job.jobId, persistedResult, job.estimatedCredits);
      return generationRepository.getJobForWorker(job.jobId);
    } catch (error) {
      await this.logGenerationFailure({ job, error });
      await generationRepository.markFailed(job.jobId, 'generation_failed', PUBLIC_GENERATION_FAILED_MESSAGE);
      await generationCreditService.refundForJob(job.userId, job.jobId, job.estimatedCredits, 'generation_failed');
      return generationRepository.getJobForWorker(job.jobId);
    }
  }

  parseQstashEnvelope(rawBody: string): QstashEnvelope<QstashGenerationPayload> {
    const envelope = JSON.parse(rawBody) as QstashEnvelope<QstashGenerationPayload>;
    if (!envelope.payload?.jobId) {
      throw new Error('QStash payload.jobId is required');
    }

    return envelope;
  }

  private getWorkerUrl() {
    const workerUrl = process.env.NEXT_PUBLIC_QSTASH_GENERATE_IMAGE_TASK_URL;
    if (!workerUrl) {
      throw new Error('NEXT_PUBLIC_QSTASH_GENERATE_IMAGE_TASK_URL is required to publish QStash generation jobs');
    }

    return workerUrl;
  }

  private getDispatchMode(): GenerationDispatchMode {
    const mode = process.env.MONICA_GENERATION_DISPATCH_MODE;
    if (
      mode === GENERATION_DISPATCH_MODE.QUEUE ||
      mode === GENERATION_DISPATCH_MODE.CLIENT_RUN ||
      mode === GENERATION_DISPATCH_MODE.INLINE
    ) {
      return mode;
    }

    return GENERATION_DISPATCH_MODE.INLINE;
  }
}

export const generationService = new GenerationService();
