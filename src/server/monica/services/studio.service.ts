import { imageRepository } from '../repositories/image.repository';

export class StudioService {
  listMyImages(userId: string) {
    return imageRepository.listStudioImages(userId);
  }
}

export const studioService = new StudioService();
