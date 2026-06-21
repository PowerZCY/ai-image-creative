import { imageRepository } from '../repositories/image.repository';

export class StudioService {
  listMyImages(userId: string) {
    return imageRepository.listStudioImages(userId);
  }

  searchMyImages(userId: string, input: Parameters<typeof imageRepository.searchStudioImages>[1]) {
    return imageRepository.searchStudioImages(userId, input);
  }

  async deleteMyImage(userId: string, imageId: string) {
    const image = await imageRepository.findOwnedGeneratedImage(userId, imageId);
    if (!image) {
      throw new Error('Generated image not found');
    }

    const hasSubmission = await imageRepository.hasActiveSubmission(image.imageId);
    if (image.isLocked || hasSubmission) {
      throw new Error('Submitted images cannot be deleted');
    }

    const result = await imageRepository.softDeleteOwnedGeneratedImage(userId, image.imageId);
    if (result.count !== 1) {
      throw new Error('Generated image could not be deleted');
    }

    return { imageId: image.imageId };
  }
}

export const studioService = new StudioService();
