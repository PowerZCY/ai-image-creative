import { prisma } from '@/server/prisma';

export type CreateSubmissionInput = {
  userId: string;
  imageId: string;
  themeId: string;
  promptSnapshot?: string | null;
  creatorNote?: string;
};

export class SubmissionRepository {
  findExistingSubmission(userId: string, imageId: string) {
    return prisma.imageSubmission.findFirst({
      where: {
        userId,
        imageId,
        deleted: 0,
        status: { not: 'withdrawn' },
      },
      include: {
        publicImage: true,
        reviews: {
          where: { deleted: 0 },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  createAndPublish(input: CreateSubmissionInput) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.imageSubmission.create({
        data: {
          userId: input.userId,
          imageId: input.imageId,
          themeId: input.themeId,
          status: 'published',
          promptSnapshot: input.promptSnapshot,
          creatorNote: input.creatorNote,
          safetyStatus: 'skipped',
          relevanceStatus: 'skipped',
          reviewSummary: 'MVP lightweight review passed',
          reviewedAt: new Date(),
          publishedAt: new Date(),
        },
      });

      await tx.reviewRecord.create({
        data: {
          submissionId: submission.submissionId,
          targetType: 'submission',
          targetId: submission.submissionId,
          reviewType: 'safety_auto',
          result: 'skipped',
          reason: 'MVP lightweight review',
          detail: {
            mode: 'mvp_lightweight_review',
          },
        },
      });

      const publicImage = await tx.publicImage.upsert({
        where: {
          imageId: input.imageId,
        },
        update: {
          submissionId: submission.submissionId,
          status: 'published',
          title: input.creatorNote?.slice(0, 255),
          publishedAt: new Date(),
          deleted: 0,
        },
        create: {
          imageId: input.imageId,
          submissionId: submission.submissionId,
          userId: input.userId,
          themeId: input.themeId,
          status: 'published',
          title: input.creatorNote?.slice(0, 255),
          promptPublic: true,
        },
      });

      await tx.generatedImage.update({
        where: { imageId: input.imageId },
        data: { status: 'published' },
      });

      return {
        ...submission,
        publicImage,
      };
    });
  }
}

export const submissionRepository = new SubmissionRepository();
