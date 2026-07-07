import { THEME_STATUS, THEME_SUBMISSION_STATUS, type ThemeStatus } from '../constants/theme';
import { normalizeGeneratorIdeas } from '../types/theme';

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

function readOptionalPositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(readString(value));
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('issueNumber must be a positive integer');
  }
  return number;
}

function readNullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return readOptionalPositiveInteger(value) ?? null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(readString).filter(Boolean).slice(0, 20);
}

function readJson(value: unknown) {
  return value && typeof value === 'object' ? value : undefined;
}

function readNullableString(value: unknown) {
  const text = readString(value);
  return text || null;
}

function normalizeThemeSlug(value: unknown) {
  const slug = readString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error('slug is required');
  }
  if (/^\d+$/.test(slug)) {
    throw new Error('slug cannot be numeric');
  }

  return slug;
}

function readNullableUrlPath(value: unknown, fieldName: string) {
  const text = readString(value);
  if (!text) return null;
  if (!/^https?:\/\//i.test(text) && !text.startsWith('/')) {
    throw new Error(`${fieldName} must be an absolute URL or a site path`);
  }
  return text;
}

export function parseThemeSubmissionDraftInput(body: Record<string, unknown>) {
  const rawTitle = readString(body.rawTitle);
  if (!rawTitle) {
    throw new Error('rawTitle is required');
  }

  return {
    title: rawTitle,
    details: readOptionalString(body.rawDescription) ?? '',
    submitReason: readOptionalString(body.triggerType),
    submitNow: body.submitNow === true,
  };
}

export function parseThemeReviewInput(body: Record<string, unknown>) {
  const action = readString(body.action);
  if (
    action !== THEME_SUBMISSION_STATUS.ACCEPTED_TO_POOL
    && action !== THEME_SUBMISSION_STATUS.REJECTED
    && action !== THEME_SUBMISSION_STATUS.DUPLICATE
  ) {
    throw new Error('action must be accepted_to_pool, rejected, or duplicate');
  }

  return {
    action,
    reason: readOptionalString(body.reason),
  };
}

export function parsePublishThemeInput(body: Record<string, unknown>) {
  const title = readString(body.title);
  if (!title) {
    throw new Error('title is required');
  }

  const status = readString(body.status) as ThemeStatus;
  if (status && status !== THEME_STATUS.SCHEDULED) {
    throw new Error('status must be scheduled');
  }

  const promptTexts = readStringArray(body.promptTexts);

  return {
    title,
    slug: normalizeThemeSlug(body.slug),
    issueNumber: readOptionalPositiveInteger(body.issueNumber),
    brief: readOptionalString(body.brief),
    description: readOptionalString(body.description),
    coverImageUrl: readOptionalString(body.coverImageUrl),
    generatorIdeas: 'generatorIdeas' in body
      ? normalizeGeneratorIdeas(body.generatorIdeas).slice(0, 20)
      : normalizeGeneratorIdeas(promptTexts),
    promptTexts,
    tags: readStringArray(body.tags),
    publishDate: readOptionalString(body.publishDate),
    status: status || THEME_STATUS.SCHEDULED,
  };
}

export function parseAdminThemeUpdateInput(body: Record<string, unknown>) {
  const title = readOptionalString(body.title);
  if ('title' in body && !title) {
    throw new Error('title cannot be empty');
  }

  return {
    title,
    slug: 'slug' in body ? normalizeThemeSlug(body.slug) : undefined,
    issueNumber: 'issueNumber' in body ? readNullablePositiveInteger(body.issueNumber) : undefined,
    brief: 'brief' in body ? readNullableString(body.brief) : undefined,
    description: 'description' in body ? readNullableString(body.description) : undefined,
    coverImageUrl: 'coverImageUrl' in body ? readNullableString(body.coverImageUrl) : undefined,
    seoTitle: 'seoTitle' in body ? readNullableString(body.seoTitle) : undefined,
    seoMetaDescription: 'seoMetaDescription' in body ? readNullableString(body.seoMetaDescription) : undefined,
    seoOgImageUrl: 'seoOgImageUrl' in body ? readNullableUrlPath(body.seoOgImageUrl, 'seoOgImageUrl') : undefined,
    seoKeywords: 'seoKeywords' in body ? readStringArray(body.seoKeywords) : undefined,
    imageSeoNotes: 'imageSeoNotes' in body ? readJson(body.imageSeoNotes) : undefined,
    generatorIdeas: 'generatorIdeas' in body
      ? normalizeGeneratorIdeas(body.generatorIdeas).slice(0, 20)
      : 'promptTexts' in body
        ? normalizeGeneratorIdeas(readStringArray(body.promptTexts))
        : undefined,
    promptTexts: 'promptTexts' in body ? readStringArray(body.promptTexts) : undefined,
    tags: 'tags' in body ? readStringArray(body.tags) : undefined,
    publishDate: 'publishDate' in body ? readNullableString(body.publishDate) : undefined,
  };
}

export function parseAdminThemeCreateInput(body: Record<string, unknown>) {
  const title = readString(body.title);
  if (!title) {
    throw new Error('title is required');
  }

  return {
    title,
    slug: normalizeThemeSlug(body.slug),
    issueNumber: readOptionalPositiveInteger(body.issueNumber),
    brief: readOptionalString(body.brief),
    description: readOptionalString(body.description),
    publishDate: readOptionalString(body.publishDate),
  };
}
