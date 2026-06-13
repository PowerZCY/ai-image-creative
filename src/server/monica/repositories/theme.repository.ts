import { prisma } from '@/server/prisma';
import { THEME_STATUS, THEME_SUBMISSION_STATUS, type ThemeSubmissionStatus } from '../constants/theme';
import { slugifyThemeTitle } from '../utils/theme-slug';

type ThemeSubmissionDraftInput = {
  rawTitle: string;
  rawDescription?: string;
  triggerType?: string;
  editedTitle?: string;
  editedBrief?: string;
  editedDescription?: string;
  sourceType?: string;
};

type ThemeSubmissionUpdateInput = Partial<Omit<ThemeSubmissionDraftInput, 'sourceType'>>;

type PublishThemeInput = {
  title: string;
  brief?: string;
  description?: string;
  coverImageUrl?: string;
  promptTexts: string[];
  tags: string[];
  publishDate?: string;
  status: string;
};

type ListThemeSubmissionsInput = {
  userId?: string;
  includeAll?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
};

function normalizeTheme(theme: Awaited<ReturnType<typeof prisma.theme.findFirst>>) {
  if (!theme) return null;
  return {
    ...theme,
    slug: slugifyThemeTitle(theme.title),
    tags: Array.isArray(theme.tags) ? theme.tags : [],
    stats: theme.stats && typeof theme.stats === 'object' ? theme.stats : {},
  };
}

export class ThemeRepository {
  async listPublicThemes() {
    const themes = await prisma.theme.findMany({
      where: {
        status: THEME_STATUS.PUBLISHED,
        deleted: 0,
      },
      orderBy: [{ sortOrder: 'desc' }, { publishDate: 'desc' }, { createdAt: 'desc' }],
      take: 80,
    });

    return themes.map((theme) => ({
      ...theme,
      slug: slugifyThemeTitle(theme.title),
      tags: Array.isArray(theme.tags) ? theme.tags : [],
      stats: theme.stats && typeof theme.stats === 'object' ? theme.stats : {},
    }));
  }

  async findPublicThemeBySlug(slug: string) {
    const themes = await this.listPublicThemes();
    return themes.find((theme) => theme.slug === slug) ?? null;
  }

  async listSubmissions(input: ListThemeSubmissionsInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(5, input.pageSize ?? 12));
    const where = {
      deleted: 0,
      ...(input.includeAll ? {} : { userId: input.userId }),
      ...(input.status && input.status !== 'all' ? { status: input.status } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.themeSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              userId: true,
              email: true,
              userName: true,
            },
          },
          acceptedTheme: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.themeSubmission.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      canReview: true,
    };
  }

  listMySubmissions(userId: string) {
    return this.listSubmissions({
      userId,
      includeAll: false,
      page: 1,
      pageSize: 100,
    });
  }

  createSubmission(userId: string, input: ThemeSubmissionDraftInput) {
    return prisma.themeSubmission.create({
      data: {
        userId,
        status: THEME_SUBMISSION_STATUS.DRAFT,
        rawTitle: input.rawTitle,
        rawDescription: input.rawDescription,
        triggerType: input.triggerType,
        editedTitle: input.editedTitle,
        editedBrief: input.editedBrief,
        editedDescription: input.editedDescription,
        sourceType: input.sourceType ?? 'user',
      },
    });
  }

  async updateOwnedDraft(userId: string, themeSubmissionId: string, input: ThemeSubmissionUpdateInput) {
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        themeSubmissionId,
        userId,
        deleted: 0,
      },
    });
    if (!existing) return null;
    if (existing.status !== THEME_SUBMISSION_STATUS.DRAFT) {
      throw new Error('Only draft theme submissions can be edited');
    }

    return prisma.themeSubmission.update({
      where: { id: existing.id },
      data: input,
    });
  }

  async submitOwnedDraft(userId: string, themeSubmissionId: string) {
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        themeSubmissionId,
        userId,
        deleted: 0,
      },
    });
    if (!existing) return null;
    if (existing.status !== THEME_SUBMISSION_STATUS.DRAFT) {
      throw new Error('Only draft theme submissions can be submitted');
    }

    return prisma.themeSubmission.update({
      where: { id: existing.id },
      data: {
        status: THEME_SUBMISSION_STATUS.UNDER_REVIEW,
        submittedAt: new Date(),
      },
    });
  }

  async reviewSubmission(reviewerUserId: string, themeSubmissionId: string, status: ThemeSubmissionStatus, reason?: string) {
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        themeSubmissionId,
        deleted: 0,
      },
    });
    if (!existing) return null;
    if (
      existing.status !== THEME_SUBMISSION_STATUS.UNDER_REVIEW
      && existing.status !== THEME_SUBMISSION_STATUS.ACCEPTED_TO_POOL
    ) {
      throw new Error('Only under-review or accepted theme submissions can be reviewed');
    }

    return prisma.themeSubmission.update({
      where: { id: existing.id },
      data: {
        status,
        reviewedByUserId: reviewerUserId,
        reviewReason: reason,
        reviewedAt: new Date(),
      },
    });
  }

  async publishFromSubmission(reviewerUserId: string, themeSubmissionId: string, input: PublishThemeInput) {
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        themeSubmissionId,
        deleted: 0,
      },
    });
    if (!existing) return null;
    if (
      existing.status !== THEME_SUBMISSION_STATUS.ACCEPTED_TO_POOL
      && existing.status !== THEME_SUBMISSION_STATUS.UNDER_REVIEW
      && existing.status !== THEME_SUBMISSION_STATUS.SELECTED
    ) {
      throw new Error('Theme submission must be under review, accepted, or selected before publishing');
    }

    return prisma.$transaction(async (tx) => {
      const theme = await tx.theme.create({
        data: {
          title: input.title,
          brief: input.brief,
          description: input.description,
          coverImageUrl: input.coverImageUrl,
          promptTexts: input.promptTexts,
          tags: input.tags,
          sourceType: existing.sourceType,
          status: input.status,
          publishDate: input.publishDate ? new Date(input.publishDate) : new Date(),
        },
      });

      const submissionStatus = input.status === THEME_STATUS.PUBLISHED
        ? THEME_SUBMISSION_STATUS.PUBLISHED
        : THEME_SUBMISSION_STATUS.SELECTED;

      const submission = await tx.themeSubmission.update({
        where: { id: existing.id },
        data: {
          status: submissionStatus,
          acceptedThemeId: theme.themeId,
          reviewedByUserId: reviewerUserId,
          reviewedAt: existing.reviewedAt ?? new Date(),
          selectedAt: new Date(),
        },
        include: {
          acceptedTheme: true,
        },
      });

      return {
        submission,
        theme: normalizeTheme(theme),
      };
    });
  }
}

export const themeRepository = new ThemeRepository();
