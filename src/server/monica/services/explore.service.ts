import { exploreRepository, type ExploreSort } from '../repositories/explore.repository';

export class ExploreService {
  listPublicImages(input: { sort?: string }) {
    const sort = input.sort === 'most_liked' || input.sort === 'featured' ? input.sort : 'newest';
    return exploreRepository.listPublicImages(sort as ExploreSort);
  }

  toggleLike(userId: string, publicImageId: string) {
    return exploreRepository.toggleLike(userId, publicImageId);
  }

  toggleSave(userId: string, publicImageId: string) {
    return exploreRepository.toggleSave(userId, publicImageId);
  }
}

export const exploreService = new ExploreService();
