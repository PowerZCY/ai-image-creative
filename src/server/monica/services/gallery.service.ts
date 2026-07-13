import { galleryRepository, type GallerySort } from '../repositories/gallery.repository';

export class GalleryService {
  listPublicImages(input: { sort?: string }) {
    const sort = input.sort === 'most_liked' || input.sort === 'featured' ? input.sort : 'newest';
    return galleryRepository.listPublicImages(sort as GallerySort);
  }

  listPublicImagesPage(input: Parameters<typeof galleryRepository.listPublicImagesPage>[0]) {
    return galleryRepository.listPublicImagesPage(input);
  }

  findPublicImageDetail(publicImageId: string) {
    return galleryRepository.findPublicImageDetail(publicImageId);
  }

  toggleLike(userId: string, publicImageId: string) {
    return galleryRepository.toggleLike(userId, publicImageId);
  }

  toggleSave(userId: string, publicImageId: string) {
    return galleryRepository.toggleSave(userId, publicImageId);
  }
}

export const galleryService = new GalleryService();
