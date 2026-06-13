import { Prisma } from '@app-prisma';
import { SAFETY_STATUS } from '../constants/safety';
import { referenceImageRepository } from '../repositories/reference-image.repository';
import { r2StorageService } from '../storage/r2-storage.service';
import { safetyService } from './safety.service';

export class ReferenceImageService {
  async createReferenceImage(userId: string, input: {
    storageKey: string;
    url?: string;
    mimeType?: string;
    width?: number;
    height?: number;
  }) {
    const safety = await safetyService.checkReferenceImages({
      mimeType: input.mimeType,
    });

    const safetyStatus = safety.status === SAFETY_STATUS.BLOCKED ? 'failed' : safety.status;

    return referenceImageRepository.create({
      userId,
      storageKey: input.storageKey,
      url: input.url,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
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
