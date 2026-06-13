import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';

type Tx = Prisma.TransactionClient;
type Client = typeof prisma | Tx;

export type CreateReferenceImageData = {
  userId: string;
  storageKey: string;
  url?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  safetyStatus: string;
  safetyResult?: Prisma.InputJsonValue;
};

export class ReferenceImageRepository {
  create(data: CreateReferenceImageData, client: Client = prisma) {
    return client.referenceImage.create({
      data: {
        userId: data.userId,
        storageKey: data.storageKey,
        url: data.url,
        mimeType: data.mimeType,
        width: data.width,
        height: data.height,
        status: 'uploaded',
        safetyStatus: data.safetyStatus,
        safetyResult: data.safetyResult ?? Prisma.JsonNull,
      },
    });
  }

  findOwned(referenceId: string, userId: string) {
    return prisma.referenceImage.findFirst({
      where: {
        referenceId,
        userId,
        deleted: 0,
      },
    });
  }

  findById(referenceId: string) {
    return prisma.referenceImage.findFirst({
      where: {
        referenceId,
        deleted: 0,
      },
    });
  }
}

export const referenceImageRepository = new ReferenceImageRepository();
