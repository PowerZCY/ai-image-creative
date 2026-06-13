import { prisma } from '@/server/prisma';
import {
  acquireLock,
  publishFIFOQueueMessage,
  releaseLock,
  type QstashEnvelope,
} from '@windrun-huaiin/backend-core/upstash/server';
import { GENERATION_QUEUE_NAME, GENERATION_STATUS, GENERATION_TYPE } from '../constants/generation';
import { SAFETY_STATUS } from '../constants/safety';
import { mockImageGenerationProvider } from '../ai/mock-image-generation-provider';
import { generationRepository } from '../repositories/generation.repository';
import type { CreateGenerationJobInput, QstashGenerationPayload } from '../types/generation';
import { generationCreditService } from './generation-credit.service';
import { referenceImageService } from './reference-image.service';
import { safetyService } from './safety.service';

const CREATE_GENERATION_LOCK_TTL_MS = 15_000;

export class GenerationService {
  async createGenerationJob(userId: string, input: CreateGenerationJobInput) {
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

  private async createGenerationJobWithLock(userId: string, input: CreateGenerationJobInput) {
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

    try {
      const publishResult = await publishFIFOQueueMessage<QstashGenerationPayload>({
        queueName: GENERATION_QUEUE_NAME,
        url: this.getWorkerUrl(),
        body: { jobId: job.jobId },
      });

      if (!publishResult) {
        throw new Error('QStash publish returned null');
      }

      await generationRepository.setQstashMessageId(job.jobId, publishResult.messageId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await generationRepository.markQueuePublishFailed(job.jobId, message);
      await generationCreditService.refundForJob(userId, job.jobId, estimatedCredits, 'queue_publish_failed');
      throw error;
    }

    return generationRepository.getJobForOwner(userId, job.jobId);
  }

  async getGenerationJob(userId: string, jobId: string) {
    return generationRepository.getJobForOwner(userId, jobId);
  }

  async runGenerationJob(jobId: string) {
    const currentJob = await generationRepository.getJobForWorker(jobId);
    if (!currentJob) {
      throw new Error(`Generation job not found: ${jobId}`);
    }

    if (generationRepository.isTerminalStatus(currentJob.status)) {
      return currentJob;
    }

    const claimed = await generationRepository.claimQueuedJob(jobId, 'qstash');
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
      const requestSafety = await safetyService.checkGenerationRequest({ prompt: job.prompt });
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

      const providerResult = await mockImageGenerationProvider.createGeneration({
        jobId: job.jobId,
        prompt: job.prompt,
        negativePrompt: job.negativePrompt,
        model: job.model,
        style: job.style,
        ratio: job.ratio,
        imageCount: job.imageCount,
        referenceImageUrl: job.referenceId
          ? await referenceImageService.createProviderAccessibleImageUrl(job.referenceId)
          : undefined,
      });

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

      await generationRepository.completeSucceeded(job.jobId, providerResult, job.estimatedCredits);
      return generationRepository.getJobForWorker(job.jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await generationRepository.markFailed(job.jobId, 'generation_failed', message);
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
}

export const generationService = new GenerationService();
