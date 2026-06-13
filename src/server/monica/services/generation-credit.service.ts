import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { creditService } from '@windrun-huaiin/backend-core/database';
import { GENERATION_FEATURE, GENERATION_TYPE, type GenerationType } from '../constants/generation';

const CREDIT_FEATURE_BY_GENERATION_TYPE: Record<GenerationType, string> = {
  [GENERATION_TYPE.TEXT_TO_IMAGE]: GENERATION_FEATURE.IMAGE_GENERATION,
  [GENERATION_TYPE.IMAGE_VARIATION]: GENERATION_FEATURE.IMAGE_VARIATION,
  [GENERATION_TYPE.IMAGE_EDIT]: GENERATION_FEATURE.IMAGE_EDIT,
};

export class GenerationCreditService {
  estimateCredits(input: { imageCount: number; generationType?: GenerationType }) {
    const count = Number.isFinite(input.imageCount) ? input.imageCount : 1;
    return Math.max(1, Math.trunc(count));
  }

  async consumeForJob(
    userId: string,
    jobId: string,
    amount: number,
    generationType: GenerationType = GENERATION_TYPE.TEXT_TO_IMAGE,
    tx?: Prisma.TransactionClient,
  ) {
    if (amount <= 0) {
      return null;
    }

    const existingConsume = await (tx ?? prisma).creditAuditLog.findFirst({
      where: {
        operationReferId: jobId,
        operationType: 'consume',
        deleted: 0,
      },
    });

    if (existingConsume) {
      return null;
    }

    const client = tx ?? prisma;
    const credit = await client.credit.findUnique({ where: { userId } });
    if (!credit) {
      throw new Error('User credits not found');
    }

    let remaining = amount;
    const free = Math.min(Math.max(credit.balanceFree, 0), remaining);
    remaining -= free;
    const oneTimePaid = Math.min(Math.max(credit.balanceOneTimePaid, 0), remaining);
    remaining -= oneTimePaid;
    const paid = Math.min(Math.max(credit.balancePaid, 0), remaining);
    remaining -= paid;

    if (remaining > 0) {
      throw new Error('Insufficient credits');
    }

    return creditService.consumeCredit(
      userId,
      { free, oneTimePaid, paid },
      {
        feature: CREDIT_FEATURE_BY_GENERATION_TYPE[generationType],
        operationReferId: jobId,
      },
      tx,
    );
  }

  async refundForJob(userId: string, jobId: string, amount: number, reason: string) {
    if (amount <= 0) {
      return null;
    }

    const existingRefund = await prisma.creditAuditLog.findFirst({
      where: {
        operationReferId: jobId,
        operationType: 'recharge',
        deleted: 0,
      },
    });

    if (existingRefund) {
      return null;
    }

    const consumeLogs = await prisma.creditAuditLog.findMany({
      where: {
        operationReferId: jobId,
        operationType: 'consume',
        deleted: 0,
      },
    });

    const free = consumeLogs
      .filter((log) => log.creditType === 'free')
      .reduce((sum, log) => sum + Math.max(log.creditsChange, 0), 0);
    const paid = consumeLogs
      .filter((log) => log.creditType === 'paid')
      .reduce((sum, log) => sum + Math.max(log.creditsChange, 0), 0);
    const oneTimePaid = consumeLogs
      .filter((log) => log.creditType === 'one_time_paid')
      .reduce((sum, log) => sum + Math.max(log.creditsChange, 0), 0);

    return creditService.rechargeCredit(userId, { free, paid, oneTimePaid }, {
      feature: reason,
      operationReferId: jobId,
    });
  }
}

export const generationCreditService = new GenerationCreditService();
