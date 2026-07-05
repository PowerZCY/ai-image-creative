import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';

type Tx = Prisma.TransactionClient;
type Client = typeof prisma | Tx;

export type CreateReferenceImageData = {
  userId: string;
  cdnImagePrefix?: string;
  storageKey: string;
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
        cdnImagePrefix: data.cdnImagePrefix,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        width: data.width,
        height: data.height,
        status: 'uploaded',
        safetyStatus: data.safetyStatus,
        safetyResult: data.safetyResult ?? Prisma.JsonNull,
      },
    });
  }

  findOwnedMany(referenceIds: string[], userId: string) {
    if (referenceIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.referenceImage.findMany({
      where: {
        referenceId: { in: referenceIds },
        userId,
        deleted: 0,
      },
    });
  }

  findByIds(referenceIds: string[]) {
    if (referenceIds.length === 0) {
      return Promise.resolve([]);
    }

    return prisma.referenceImage.findMany({
      where: {
        referenceId: { in: referenceIds },
        deleted: 0,
      },
    });
  }
}

export const referenceImageRepository = new ReferenceImageRepository();
