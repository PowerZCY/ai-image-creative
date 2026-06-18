import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { THEME_STATUS, THEME_SUBMISSION_STATUS, type ThemeSubmissionStatus } from '../constants/theme';
import { buildPagination, normalizePagination, readStringFilter, type MonicaPagedRequest } from '../types/pagination';
import { buildStoredImageUrl } from '../utils/image-url';
import { slugifyThemeTitle } from '../utils/theme-slug';

type ThemeRecord = NonNullable<Awaited<ReturnType<typeof prisma.theme.findFirst>>>;

type ThemeSubmissionDraftInput = {
  title: string;
  details: string;
  submitReason?: string;
  submitNow?: boolean;
};

type ThemeSubmissionUpdateInput = Partial<ThemeSubmissionDraftInput>;

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

type AdminThemeUpdateInput = {
  title?: string;
  brief?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  promptTexts?: string[];
  tags?: string[];
  publishDate?: string | null;
  featuredImageIds?: bigint[];
};

type ListThemeSubmissionsInput = {
  userId?: string;
  includeAll?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
};

type ThemeSearchFilters = {
  keyword?: string;
  visibility?: string;
  sourceType?: string;
};

type ThemeSubmissionSearchFilters = {
  keyword?: string;
  status?: string;
  userId?: string;
};

const PUBLIC_THEME_TIME_ZONE = process.env.MONICA_PUBLICATION_TIME_ZONE || 'Asia/Shanghai';

function getPublicThemeDateCutoff() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: PUBLIC_THEME_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return new Date(`${date}T00:00:00.000Z`);
}

function publicThemeWhere(keyword?: string): Prisma.ThemeWhereInput {
  const publicDateCutoff = getPublicThemeDateCutoff();
  return {
    deleted: 0,
    publishDate: {
      not: null,
      lte: publicDateCutoff,
    },
    ...(keyword
      ? {
          AND: [
            {
              OR: [
                { title: { contains: keyword, mode: 'insensitive' } },
                { brief: { contains: keyword, mode: 'insensitive' } },
                { themeNote: { contains: keyword, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : {}),
  };
}

function normalizeTheme(theme: ThemeRecord) {
  return {
    ...theme,
    slug: slugifyThemeTitle(theme.title),
    description: theme.themeNote,
    promptTexts: theme.generatorIdeas,
    tags: Array.isArray(theme.tags) ? theme.tags : [],
    stats: theme.stats && typeof theme.stats === 'object' ? theme.stats : {},
  };
}

type NormalizedTheme = ReturnType<typeof normalizeTheme>;

async function attachFeaturedImages(themes: NormalizedTheme[]) {
  const featuredIds = [
    ...new Set(themes.flatMap((theme) => (theme.featuredImageIds ?? []).slice(0, 3)).map((id) => id.toString())),
  ].map((id) => BigInt(id));

  if (featuredIds.length === 0) {
    return themes.map((theme) => ({ ...theme, featuredImages: [] }));
  }

  const publicImages = await prisma.publicImage.findMany({
    where: {
      id: { in: featuredIds },
      deleted: 0,
    },
  });
  const generatedImages = publicImages.length
    ? await prisma.generatedImage.findMany({
        where: {
          imageId: { in: publicImages.map((image) => image.imageId) },
          deleted: 0,
        },
      })
    : [];
  const generatedByImageId = new Map(generatedImages.map((image) => [image.imageId, image]));
  const publicImageById = new Map(publicImages.map((publicImage) => {
    const image = generatedByImageId.get(publicImage.imageId);
    const imageUrl = image ? buildStoredImageUrl(image) : null;
    return [
      publicImage.id.toString(),
      {
        id: publicImage.id.toString(),
        publicImageId: publicImage.publicImageId,
        title: publicImage.title,
        imageUrl,
        thumbnailUrl: imageUrl,
      },
    ];
  }));

  return themes.map((theme) => ({
    ...theme,
    featuredImages: (theme.featuredImageIds ?? [])
      .slice(0, 3)
      .map((id) => publicImageById.get(id.toString()) ?? null),
  }));
}

function toSubmissionId(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error('themeSubmissionId must be a numeric id');
  }

  return BigInt(value);
}

function appendReviewFlow(
  current: Prisma.JsonValue | null | undefined,
  node: {
    status: string;
    actorUserId: string;
    actorType: string;
    note?: string;
  },
) {
  const items = Array.isArray(current) ? current : [];
  return [
    ...items,
    {
      ...node,
      createdAt: new Date().toISOString(),
    },
  ] as Prisma.InputJsonValue;
}

function mapSubmissionForApi<T extends { id: bigint; title: string; details: string; submitReason?: string | null }>(
  submission: T,
  acceptedTheme?: unknown,
  user?: unknown,
) {
  return {
    ...submission,
    themeSubmissionId: submission.id.toString(),
    rawTitle: submission.title,
    rawDescription: submission.details,
    editedTitle: submission.title,
    editedBrief: submission.details,
    editedDescription: submission.details,
    acceptedTheme: acceptedTheme ?? null,
    user: user ?? null,
  };
}

export class ThemeRepository {
  async listPublicThemes() {
    const themes = await prisma.theme.findMany({
      where: publicThemeWhere(),
      orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
      take: 80,
    });

    return attachFeaturedImages(themes.map((theme) => normalizeTheme(theme)));
  }

  async searchPublicThemes(input: MonicaPagedRequest<ThemeSearchFilters>) {
    const { page, pageSize, skip } = normalizePagination(input);
    const keyword = readStringFilter(input.filters?.keyword);
    const where = publicThemeWhere(keyword);

    const [items, total] = await prisma.$transaction([
      prisma.theme.findMany({
        where,
        orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.theme.count({ where }),
    ]);

    return {
      items: await attachFeaturedImages(items.map((theme) => normalizeTheme(theme))),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  async searchAdminThemes(input: MonicaPagedRequest<ThemeSearchFilters>) {
    const { page, pageSize, skip } = normalizePagination(input);
    const keyword = readStringFilter(input.filters?.keyword);
    const sourceType = readStringFilter(input.filters?.sourceType);
    const visibility = readStringFilter(input.filters?.visibility);
    const where: Prisma.ThemeWhereInput = {
      ...(visibility === 'deleted' ? { deleted: 1 } : { deleted: 0 }),
      ...(sourceType ? { sourceType } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { brief: { contains: keyword, mode: 'insensitive' } },
              { themeNote: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.theme.findMany({
        where,
        orderBy: [{ publishDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.theme.count({ where }),
    ]);

    return {
      items: await attachFeaturedImages(items.map((theme) => normalizeTheme(theme))),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  async findPublicThemeBySlug(slug: string) {
    if (/^\d+$/.test(slug)) {
      const theme = await prisma.theme.findFirst({
        where: {
          ...publicThemeWhere(),
          id: BigInt(slug),
        },
      });

      return theme ? normalizeTheme(theme) : null;
    }

    const themes = await this.listPublicThemes();
    return themes.find((theme) => theme?.slug === slug) ?? null;
  }

  async findPublicThemeById(themeId: bigint) {
    return prisma.theme.findFirst({
      where: {
        ...publicThemeWhere(),
        id: themeId,
      },
    });
  }

  async updateAdminTheme(themeId: string, input: AdminThemeUpdateInput) {
    if (!/^\d+$/.test(themeId)) return null;

    const data: Prisma.ThemeUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.brief !== undefined) data.brief = input.brief;
    if (input.description !== undefined) data.themeNote = input.description;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.promptTexts !== undefined) data.generatorIdeas = input.promptTexts;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.publishDate !== undefined) data.publishDate = input.publishDate ? new Date(input.publishDate) : null;
    if (input.featuredImageIds !== undefined) data.featuredImageIds = input.featuredImageIds;

    const theme = await prisma.theme.update({
      where: { id: BigInt(themeId) },
      data,
    });

    return normalizeTheme(theme);
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
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.themeSubmission.count({ where }),
    ]);

    const submissionIds = items.map((item) => item.id);
    const userIds = [...new Set(items.map((item) => item.userId))];
    const [themes, users] = await Promise.all([
      submissionIds.length
        ? prisma.theme.findMany({
            where: {
              sourceSubmissionId: { in: submissionIds },
              deleted: 0,
            },
          })
        : [],
      userIds.length
        ? prisma.user.findMany({
            where: { userId: { in: userIds } },
            select: {
              userId: true,
              email: true,
              userName: true,
            },
          })
        : [],
    ]);

    const themeBySubmissionId = new Map(themes.map((theme) => [theme.sourceSubmissionId?.toString(), normalizeTheme(theme)]));
    const userById = new Map(users.map((user) => [user.userId, user]));

    return {
      items: items.map((item) => mapSubmissionForApi(
        item,
        themeBySubmissionId.get(item.id.toString()),
        userById.get(item.userId),
      )),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      canReview: Boolean(input.includeAll),
    };
  }

  async searchSubmissions(input: MonicaPagedRequest<ThemeSubmissionSearchFilters> & { currentUserId?: string; includeAll?: boolean }) {
    const { page, pageSize, skip } = normalizePagination(input);
    const keyword = readStringFilter(input.filters?.keyword);
    const status = readStringFilter(input.filters?.status);
    const userId = input.includeAll ? readStringFilter(input.filters?.userId) : input.currentUserId;
    const where: Prisma.ThemeSubmissionWhereInput = {
      deleted: 0,
      ...(userId ? { userId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' } },
              { details: { contains: keyword, mode: 'insensitive' } },
              { submitReason: { contains: keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.themeSubmission.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.themeSubmission.count({ where }),
    ]);

    const submissionIds = items.map((item) => item.id);
    const userIds = [...new Set(items.map((item) => item.userId))];
    const [themes, users] = await Promise.all([
      submissionIds.length
        ? prisma.theme.findMany({
            where: {
              sourceSubmissionId: { in: submissionIds },
              deleted: 0,
            },
          })
        : [],
      userIds.length
        ? prisma.user.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, email: true, userName: true },
          })
        : [],
    ]);

    const themeBySubmissionId = new Map(themes.map((theme) => [theme.sourceSubmissionId?.toString(), normalizeTheme(theme)]));
    const userById = new Map(users.map((user) => [user.userId, user]));

    return {
      items: items.map((item) => mapSubmissionForApi(
        item,
        themeBySubmissionId.get(item.id.toString()),
        userById.get(item.userId),
      )),
      pagination: buildPagination({ page, pageSize, total }),
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
    const status = input.submitNow ? THEME_SUBMISSION_STATUS.UNDER_REVIEW : THEME_SUBMISSION_STATUS.DRAFT;
    return prisma.themeSubmission.create({
      data: {
        userId,
        status,
        title: input.title,
        details: input.details,
        submitReason: input.submitReason,
        submittedAt: input.submitNow ? new Date() : undefined,
        reviewFlow: appendReviewFlow(null, {
          status,
          actorUserId: userId,
          actorType: 'user',
          note: input.submitReason,
        }),
      },
    }).then((submission) => mapSubmissionForApi(submission));
  }

  async updateOwnedDraft(userId: string, themeSubmissionId: string, input: ThemeSubmissionUpdateInput) {
    const id = toSubmissionId(themeSubmissionId);
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        id,
        userId,
        deleted: 0,
      },
    });
    if (!existing) return null;
    if (existing.status !== THEME_SUBMISSION_STATUS.DRAFT) {
      throw new Error('Only draft theme submissions can be edited');
    }

    const submission = await prisma.themeSubmission.update({
      where: { id: existing.id },
      data: input,
    });

    return mapSubmissionForApi(submission);
  }

  async submitOwnedDraft(userId: string, themeSubmissionId: string) {
    const id = toSubmissionId(themeSubmissionId);
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        id,
        userId,
        deleted: 0,
      },
    });
    if (!existing) return null;
    if (existing.status !== THEME_SUBMISSION_STATUS.DRAFT) {
      throw new Error('Only draft theme submissions can be submitted');
    }

    const submission = await prisma.themeSubmission.update({
      where: { id: existing.id },
      data: {
        status: THEME_SUBMISSION_STATUS.UNDER_REVIEW,
        submittedAt: new Date(),
        reviewFlow: appendReviewFlow(existing.reviewFlow, {
          status: THEME_SUBMISSION_STATUS.UNDER_REVIEW,
          actorUserId: userId,
          actorType: 'user',
        }),
      },
    });

    return mapSubmissionForApi(submission);
  }

  async reviewSubmission(reviewerUserId: string, themeSubmissionId: string, status: ThemeSubmissionStatus, reason?: string) {
    const id = toSubmissionId(themeSubmissionId);
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        id,
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

    const submission = await prisma.themeSubmission.update({
      where: { id: existing.id },
      data: {
        status,
        reviewFlow: appendReviewFlow(existing.reviewFlow, {
          status,
          actorUserId: reviewerUserId,
          actorType: 'reviewer',
          note: reason,
        }),
      },
    });

    return mapSubmissionForApi(submission);
  }

  async publishFromSubmission(reviewerUserId: string, themeSubmissionId: string, input: PublishThemeInput) {
    const id = toSubmissionId(themeSubmissionId);
    const existing = await prisma.themeSubmission.findFirst({
      where: {
        id,
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
      const themeData = {
        title: input.title,
        brief: input.brief,
        themeNote: input.description,
        coverImageUrl: input.coverImageUrl,
        generatorIdeas: input.promptTexts,
        tags: input.tags,
        sourceType: 'theme_submission',
        sourceSubmissionId: existing.id,
        publishDate: input.publishDate ? new Date(input.publishDate) : new Date(),
      };
      const existingTheme = await tx.theme.findFirst({
        where: {
          sourceSubmissionId: existing.id,
          deleted: 0,
        },
      });
      const theme = existingTheme
        ? await tx.theme.update({
            where: { id: existingTheme.id },
            data: themeData,
          })
        : await tx.theme.create({
            data: themeData,
          });

      const submissionStatus = input.status === THEME_STATUS.PUBLISHED
        ? THEME_SUBMISSION_STATUS.PUBLISHED
        : THEME_SUBMISSION_STATUS.SELECTED;

      const submission = await tx.themeSubmission.update({
        where: { id: existing.id },
        data: {
          status: submissionStatus,
          reviewFlow: appendReviewFlow(existing.reviewFlow, {
            status: submissionStatus,
            actorUserId: reviewerUserId,
            actorType: 'reviewer',
            note: `Theme ${input.status}`,
          }),
        },
      });

      return {
        submission: mapSubmissionForApi(submission, normalizeTheme(theme)),
        theme: normalizeTheme(theme),
      };
    });
  }
}

export const themeRepository = new ThemeRepository();
