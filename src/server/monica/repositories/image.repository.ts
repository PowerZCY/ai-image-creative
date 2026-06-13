import { prisma } from '@/server/prisma';

export class ImageRepository {
  listStudioImages(userId: string) {
    return prisma.generatedImage.findMany({
      where: {
        userId,
        deleted: 0,
      },
      include: {
        publicImage: true,
        submissions: {
          where: { deleted: 0 },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
  }

  findOwnedGeneratedImage(userId: string, imageId: string) {
    return prisma.generatedImage.findFirst({
      where: {
        imageId,
        userId,
        deleted: 0,
      },
    });
  }
}

export const imageRepository = new ImageRepository();
