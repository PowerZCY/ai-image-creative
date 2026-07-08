import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';

export type CreateSubmissionInput = {
  userId: string;
  imageId: string;
  themeId: bigint;
  title: string;
  promptSnapshot?: string | null;
  creationNote?: string;
};

function appendReviewFlow(flow: Prisma.JsonValue | null | undefined, event: {
  actorUserId: string;
  actorType: string;
  status: string;
  note?: string;
}) {
  const currentFlow = Array.isArray(flow) ? flow : [];
  return [
    ...currentFlow,
    {
      status: event.status,
      actorUserId: event.actorUserId,
      actorType: event.actorType,
      note: event.note,
      createdAt: new Date().toISOString(),
    },
  ] satisfies Prisma.InputJsonValue;
}

export class SubmissionRepository {
  async findExistingSubmission(userId: string, imageId: string) {
    const submission = await prisma.imageSubmission.findFirst({
      where: {
        userId,
        imageId,
        deleted: 0,
        status: { not: 'withdrawn' },
      },
      orderBy: { submittedAt: 'desc' },
    });
    if (!submission) return null;

    const publicImage = await prisma.publicImage.findFirst({
      where: {
        imageId,
        deleted: 0,
      },
    });

    return {
      ...submission,
      publicImage,
    };
  }

  createPublicImageDirect(input: {
    imageId: string;
    userId: string;
    themeId: bigint;
    title: string;
    altText?: string | null;
    creationNote?: string | null;
    createdBy: string;
  }) {
    return prisma.publicImage.upsert({
      where: { imageId: input.imageId },
      update: {
        userId: input.userId,
        themeId: input.themeId,
        title: input.title,
        altText: input.altText,
        creationNote: input.creationNote,
        imageSource: 'generated',
        sourceType: 'admin_direct',
        createdBy: input.createdBy,
        publishedAt: new Date(),
        deleted: 0,
      },
      create: {
        imageId: input.imageId,
        userId: input.userId,
        themeId: input.themeId,
        title: input.title,
        altText: input.altText,
        creationNote: input.creationNote,
        imageSource: 'generated',
        sourceType: 'admin_direct',
        createdBy: input.createdBy,
        promptPublic: true,
      },
    });
  }

  createForReview(input: CreateSubmissionInput) {
    return prisma.$transaction(async (tx) => {
      const submission = await tx.imageSubmission.create({
        data: {
          userId: input.userId,
          imageId: input.imageId,
          themeId: input.themeId,
          status: 'under_review',
          title: input.title,
          promptSnapshot: input.promptSnapshot,
          creationNote: input.creationNote,
          reviewFlow: appendReviewFlow(null, {
            actorUserId: input.userId,
            actorType: 'user',
            status: 'under_review',
            note: input.creationNote || 'Submitted for review',
          }),
        },
      });

      await tx.generatedImage.update({
        where: { imageId: input.imageId },
        data: {
          status: 'under_review',
          isLocked: true,
        },
      });

      return submission;
    });
  }

  reviewImageSubmission(reviewerUserId: string, submissionId: string, action: 'approved' | 'rejected', note?: string, altText?: string | null) {
    if (!/^\d+$/.test(submissionId)) return null;

    return prisma.$transaction(async (tx) => {
      const existing = await tx.imageSubmission.findFirst({
        where: {
          id: BigInt(submissionId),
          deleted: 0,
        },
      });
      if (!existing) return null;
      if (!['submitted', 'under_review', 'needs_review'].includes(existing.status)) {
        throw new Error('Image submission cannot be reviewed in its current status');
      }

      const submission = await tx.imageSubmission.update({
        where: { id: existing.id },
        data: {
          status: action,
          reviewFlow: appendReviewFlow(existing.reviewFlow, {
            actorUserId: reviewerUserId,
            actorType: 'reviewer',
            status: action,
            note,
          }),
        },
      });

      let publicImage = null;
      if (action === 'approved') {
        publicImage = await tx.publicImage.upsert({
          where: {
            imageId: existing.imageId,
          },
          update: {
            sourceSubmissionId: existing.id,
            sourceType: 'user_submission',
            userId: existing.userId,
            themeId: existing.themeId,
            title: existing.title,
            altText,
            creationNote: existing.creationNote,
            imageSource: 'generated',
            publishedAt: new Date(),
            deleted: 0,
          },
          create: {
            imageId: existing.imageId,
            sourceSubmissionId: existing.id,
            imageSource: 'generated',
            sourceType: 'user_submission',
            userId: existing.userId,
            themeId: existing.themeId,
            title: existing.title,
            altText,
            creationNote: existing.creationNote,
            promptPublic: true,
          },
        });
      }

      await tx.generatedImage.update({
        where: { imageId: existing.imageId },
        data: {
          status: action,
          isLocked: action === 'approved',
        },
      });

      return {
        ...submission,
        publicImage,
      };
    });
  }
}

export const submissionRepository = new SubmissionRepository();
