import { Prisma } from '@app-prisma';
import { SAFETY_STATUS } from '../constants/safety';
import { referenceImageRepository } from '../repositories/reference-image.repository';
import { buildProviderReferenceImageUrl } from '../utils/image-url';
import { safetyService } from './safety.service';

export class ReferenceImageService {
  async createReferenceImage(userId: string, input: {
    storageKey: string;
    cdnImagePrefix?: string;
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
      cdnImagePrefix: input.cdnImagePrefix,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      safetyStatus,
      safetyResult: safety as Prisma.InputJsonValue,
    });
  }

  async assertOwnedReferenceImages(userId: string, referenceIds: string[] = []) {
    if (referenceIds.length === 0) {
      return [];
    }

    const referenceImages = await referenceImageRepository.findOwnedMany(referenceIds, userId);
    const referenceImagesById = new Map(referenceImages.map((image) => [image.referenceId, image]));

    return referenceIds.map((referenceId) => {
      const referenceImage = referenceImagesById.get(referenceId);
      if (!referenceImage) {
        throw new Error('Reference image not found');
      }
      if (referenceImage.safetyStatus === 'failed') {
        throw new Error('Reference image is blocked');
      }
      return referenceImage;
    });
  }

  async createProviderAccessibleImageUrls(referenceIds: string[]) {
    if (referenceIds.length === 0) {
      return [];
    }

    const referenceImages = await referenceImageRepository.findByIds(referenceIds);
    const referenceImagesById = new Map(referenceImages.map((image) => [image.referenceId, image]));

    return referenceIds.map((referenceId) => {
      const referenceImage = referenceImagesById.get(referenceId);
      if (!referenceImage) {
        throw new Error('Reference image not found');
      }
      return buildProviderReferenceImageUrl(referenceImage);
    });
  }
}

export const referenceImageService = new ReferenceImageService();
