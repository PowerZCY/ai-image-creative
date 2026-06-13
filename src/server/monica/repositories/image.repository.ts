import { prisma } from '@/server/prisma';

export class ImageRepository {
  listStudioImages(userId: string) {
    return prisma.generatedImage.findMany({
      where: {
        userId,
        deleted: 0,
      },
      include: {
        job: {
          select: {
            prompt: true,
            model: true,
            style: true,
            ratio: true,
          },
        },
        publicImage: true,
        submissions: {
          where: { deleted: 0 },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }).then((images) => images.map((image) => ({
      ...image,
      promptUsed: image.promptUsed ?? image.job?.prompt ?? null,
      model: image.model ?? image.job?.model ?? null,
      style: image.style ?? image.job?.style ?? null,
      ratio: image.ratio ?? image.job?.ratio ?? null,
    })));
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
