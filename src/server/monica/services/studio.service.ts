import { imageRepository } from '../repositories/image.repository';

export class StudioService {
  listMyImages(userId: string) {
    return imageRepository.listStudioImages(userId);
  }

  searchMyImages(userId: string, input: Parameters<typeof imageRepository.searchStudioImages>[1]) {
    return imageRepository.searchStudioImages(userId, input);
  }
}

export const studioService = new StudioService();
