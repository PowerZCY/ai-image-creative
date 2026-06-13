import { Prisma } from '@app-prisma';
import { SAFETY_STATUS } from '../constants/safety';
import { referenceImageRepository } from '../repositories/reference-image.repository';
import { r2StorageService } from '../storage/r2-storage.service';
import { safetyService } from './safety.service';

export class ReferenceImageService {
  async uploadReferenceImage(userId: string, input: { file: File; sessionId?: string }) {
    const uploaded = await r2StorageService.uploadReferenceImage(userId, input.file);
    const safety = await safetyService.checkReferenceImages({
      mimeType: uploaded.mimeType,
    });

    const safetyStatus = safety.status === SAFETY_STATUS.BLOCKED ? 'failed' : safety.status;

    return referenceImageRepository.create({
      userId,
      sessionId: input.sessionId,
      storageKey: uploaded.storageKey,
      url: uploaded.url,
      mimeType: uploaded.mimeType,
      width: uploaded.width,
      height: uploaded.height,
      safetyStatus,
      safetyResult: safety as Prisma.InputJsonValue,
    });
  }

  async assertOwnedReferenceImage(userId: string, referenceId?: string) {
    if (!referenceId) {
      return null;
    }

    const referenceImage = await referenceImageRepository.findOwned(referenceId, userId);
    if (!referenceImage) {
      throw new Error('Reference image not found');
    }
    if (referenceImage.safetyStatus === 'failed') {
      throw new Error('Reference image is blocked');
    }

    return referenceImage;
  }

  async createProviderAccessibleImageUrl(referenceId: string) {
    const referenceImage = await referenceImageRepository.findById(referenceId);
    if (!referenceImage) {
      throw new Error('Reference image not found');
    }

    return r2StorageService.createProviderAccessibleImageUrl(referenceImage.storageKey);
  }
}

export const referenceImageService = new ReferenceImageService();
