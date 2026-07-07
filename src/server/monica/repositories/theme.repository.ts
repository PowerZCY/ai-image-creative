import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';
import { THEME_SUBMISSION_STATUS, type ThemeSubmissionStatus } from '../constants/theme';
import { buildPagination, normalizePagination, readStringFilter, type MonicaPagedRequest } from '../types/pagination';
import { buildStoredImageUrl } from '../utils/image-url';
import { generatorIdeasToJson, normalizeGeneratorIdeas, type ThemeGeneratorIdea } from '../types/theme';

type ThemeRecord = NonNullable<Awaited<ReturnType<typeof prisma.theme.findFirst>>>;

type ThemeSubmissionDraftInput = {
  title: string;
  details: string;
  submitReason?: string;
  submitNow?: boolean;
};

type PublishThemeInput = {
  title: string;
  slug: string;
  issueNumber?: number;
  brief?: string;
  description?: string;
  coverImageUrl?: string;
  generatorIdeas: ThemeGeneratorIdea[];
  promptTexts: string[];
  tags: string[];
  publishDate?: string;
  status: string;
};

type AdminThemeUpdateInput = {
  title?: string;
  slug?: string;
  issueNumber?: number | null;
  brief?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  seoTitle?: string | null;
  seoMetaDescription?: string | null;
  seoOgImageUrl?: string | null;
  seoKeywords?: string[];
  imageSeoNotes?: unknown;
  generatorIdeas?: ThemeGeneratorIdea[];
  promptTexts?: string[];
  tags?: string[];
  publishDate?: string | null;
};

type AdminThemeCreateInput = {
  title: string;
  slug: string;
  issueNumber?: number;
  brief?: string;
  description?: string;
  publishDate?: string;
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

const USER_THEME_STATUS_TO_INTERNAL: Record<string, string[]> = {
  under_review: [
    THEME_SUBMISSION_STATUS.DRAFT,
    THEME_SUBMISSION_STATUS.UNDER_REVIEW,
    THEME_SUBMISSION_STATUS.ACCEPTED_TO_POOL,
  ],
  accepted: [
    THEME_SUBMISSION_STATUS.SELECTED,
    THEME_SUBMISSION_STATUS.PUBLISHED,
  ],
  not_selected: [
    THEME_SUBMISSION_STATUS.REJECTED,
    THEME_SUBMISSION_STATUS.DUPLICATE,
  ],
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
  const generatorIdeas = normalizeGeneratorIdeas(theme.generatorIdeas);
  const featuredCount = 0;
  const issueNumber = (theme as { issueNumber?: number | null }).issueNumber ?? null;
  return {
    ...theme,
    issueNumber,
    slug: theme.slug,
    description: theme.themeNote,
    generatorIdeas,
    promptTexts: generatorIdeas.map((idea) => idea.prompt),
    tags: Array.isArray(theme.tags) ? theme.tags : [],
    stats: theme.stats && typeof theme.stats === 'object' ? theme.stats : {},
    readiness: {
      contentOk: Boolean(theme.title && theme.brief && theme.themeNote),
      seoOk: Boolean(theme.seoTitle && theme.seoMetaDescription && theme.seoKeywords.length > 0),
      ideasOk: generatorIdeas.length >= 3,
      featuredCount,
      publishDateSet: Boolean(theme.publishDate),
    },
  };
}

type NormalizedTheme = ReturnType<typeof normalizeTheme>;

async function attachFeaturedImages(themes: NormalizedTheme[]) {
  const themeIds = themes.map((theme) => theme.id);
  const featuredRows = themeIds.length
    ? await prisma.themeFeaturedImage.findMany({
        where: {
          themeId: { in: themeIds },
          deleted: 0,
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      })
    : [];
  const rowsByThemeId = new Map<string, typeof featuredRows>();
  for (const row of featuredRows) {
    const key = row.themeId.toString();
    rowsByThemeId.set(key, [...(rowsByThemeId.get(key) ?? []), row]);
  }
  const featuredIds = [
    ...new Set(
      themes.flatMap((theme) => {
        const rows = rowsByThemeId.get(theme.id.toString());
        return rows?.slice(0, 3).map((row) => row.publicImageId) ?? [];
      }),
    ),
  ];

  if (featuredIds.length === 0) {
    return themes.map((theme) => ({ ...theme, featuredImages: [] }));
  }

  const publicImages = await prisma.publicImage.findMany({
    where: {
      publicImageId: { in: featuredIds },
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
      publicImage.publicImageId,
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
    readiness: {
      ...theme.readiness,
      featuredCount: rowsByThemeId.get(theme.id.toString())?.filter((row) => row.deleted === 0).length ?? 0,
    },
    featuredImages: (rowsByThemeId.get(theme.id.toString()) ?? [])
      .slice(0, 3)
      .map((row) => publicImageById.get(row.publicImageId) ?? null),
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

function mapUserThemeSubmissionStatus(status: string) {
  if (status === THEME_SUBMISSION_STATUS.SELECTED || status === THEME_SUBMISSION_STATUS.PUBLISHED) {
    return 'accepted';
  }
  if (status === THEME_SUBMISSION_STATUS.REJECTED || status === THEME_SUBMISSION_STATUS.DUPLICATE) {
    return 'not_selected';
  }
  return 'under_review';
}

function mapSubmissionForUserApi<T extends {
  id: bigint;
  title: string;
  details: string;
  submitReason?: string | null;
  status: string;
  submittedAt?: Date | string | null;
  createdAt?: Date | string | null;
  reviewFlow?: Prisma.JsonValue | null;
}>(submission: T, acceptedTheme?: unknown) {
  return {
    themeSubmissionId: submission.id.toString(),
    title: submission.title,
    details: submission.details,
    submitReason: submission.submitReason ?? null,
    submittedAt: submission.submittedAt ?? submission.createdAt ?? null,
    status: mapUserThemeSubmissionStatus(submission.status),
    notes: submission.reviewFlow ?? null,
    acceptedTheme: acceptedTheme ?? null,
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
    const theme = await prisma.theme.findFirst({
      where: {
        ...publicThemeWhere(),
        slug,
      },
    });

    return theme ? normalizeTheme(theme) : null;
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
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.issueNumber !== undefined) (data as { issueNumber?: number | null }).issueNumber = input.issueNumber;
    if (input.brief !== undefined) data.brief = input.brief;
    if (input.description !== undefined) data.themeNote = input.description;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle;
    if (input.seoMetaDescription !== undefined) data.seoMetaDescription = input.seoMetaDescription;
    if (input.seoOgImageUrl !== undefined) data.seoOgImageUrl = input.seoOgImageUrl;
    if (input.seoKeywords !== undefined) data.seoKeywords = input.seoKeywords;
    if (input.imageSeoNotes !== undefined) data.imageSeoNotes = input.imageSeoNotes as Prisma.InputJsonValue;
    if (input.generatorIdeas !== undefined) data.generatorIdeas = generatorIdeasToJson(input.generatorIdeas);
    else if (input.promptTexts !== undefined) data.generatorIdeas = generatorIdeasToJson(normalizeGeneratorIdeas(input.promptTexts));
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.publishDate !== undefined) data.publishDate = input.publishDate ? new Date(input.publishDate) : null;

    const theme = await prisma.theme.update({
      where: { id: BigInt(themeId) },
      data,
    });

    return normalizeTheme(theme);
  }

  async createAdminTheme(input: AdminThemeCreateInput) {
    const theme = await prisma.theme.create({
      data: {
        title: input.title,
        slug: input.slug,
        issueNumber: input.issueNumber,
        brief: input.brief,
        themeNote: input.description,
        publishDate: input.publishDate ? new Date(input.publishDate) : null,
        sourceType: 'admin',
        generatorIdeas: generatorIdeasToJson([]),
        tags: [],
      },
    });

    return normalizeTheme(theme);
  }

  async searchSubmissions(input: MonicaPagedRequest<ThemeSubmissionSearchFilters> & { currentUserId?: string; includeAll?: boolean }) {
    const { page, pageSize, skip } = normalizePagination(input);
    const keyword = readStringFilter(input.filters?.keyword);
    const status = readStringFilter(input.filters?.status);
    const userId = input.includeAll ? readStringFilter(input.filters?.userId) : input.currentUserId;
    const userStatusFilter = !input.includeAll && status && status !== 'all'
      ? USER_THEME_STATUS_TO_INTERNAL[status] ?? [status]
      : null;
    const where: Prisma.ThemeSubmissionWhereInput = {
      deleted: 0,
      ...(userId ? { userId } : {}),
      ...(status && status !== 'all'
        ? userStatusFilter
          ? { status: { in: userStatusFilter } }
          : { status }
        : {}),
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
      items: items.map((item) => (
        input.includeAll
          ? mapSubmissionForApi(item, themeBySubmissionId.get(item.id.toString()), userById.get(item.userId))
          : mapSubmissionForUserApi(item, themeBySubmissionId.get(item.id.toString()))
      )),
      pagination: buildPagination({ page, pageSize, total }),
    };
  }

  async createSubmission(userId: string, input: ThemeSubmissionDraftInput) {
    const status = input.submitNow ? THEME_SUBMISSION_STATUS.UNDER_REVIEW : THEME_SUBMISSION_STATUS.DRAFT;
    const [existingSubmittedCount, submission] = await prisma.$transaction([
      prisma.themeSubmission.count({
        where: {
          userId,
          deleted: 0,
          status: { not: THEME_SUBMISSION_STATUS.DRAFT },
        },
      }),
      prisma.themeSubmission.create({
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
      }),
    ]);

    return {
      submission: mapSubmissionForApi(submission),
      isFirstSubmission: input.submitNow && existingSubmittedCount === 0,
    };
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
        slug: input.slug,
        issueNumber: input.issueNumber,
        brief: input.brief,
        themeNote: input.description,
        coverImageUrl: input.coverImageUrl,
        generatorIdeas: generatorIdeasToJson(input.generatorIdeas),
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

      const submissionStatus = THEME_SUBMISSION_STATUS.SELECTED;

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
