import { THEME_STATUS, THEME_SUBMISSION_STATUS, type ThemeStatus } from '../constants/theme';

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown) {
  const text = readString(value);
  return text || undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(readString).filter(Boolean).slice(0, 20);
}

function readNullableString(value: unknown) {
  const text = readString(value);
  return text || null;
}

function readBigIntArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => readString(item))
    .filter((item) => /^\d+$/.test(item))
    .slice(0, 30)
    .map((item) => BigInt(item));
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

export function parseThemeSubmissionUpdateInput(body: Record<string, unknown>) {
  return {
    title: readOptionalString(body.rawTitle),
    details: readOptionalString(body.rawDescription),
    submitReason: readOptionalString(body.triggerType),
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
  if (status && status !== THEME_STATUS.SCHEDULED && status !== THEME_STATUS.PUBLISHED) {
    throw new Error('status must be scheduled or published');
  }

  return {
    title,
    brief: readOptionalString(body.brief),
    description: readOptionalString(body.description),
    coverImageUrl: readOptionalString(body.coverImageUrl),
    promptTexts: readStringArray(body.promptTexts),
    tags: readStringArray(body.tags),
    publishDate: readOptionalString(body.publishDate),
    status: status || THEME_STATUS.PUBLISHED,
  };
}

export function parseAdminThemeUpdateInput(body: Record<string, unknown>) {
  const title = readOptionalString(body.title);
  if ('title' in body && !title) {
    throw new Error('title cannot be empty');
  }

  return {
    title,
    brief: 'brief' in body ? readNullableString(body.brief) : undefined,
    description: 'description' in body ? readNullableString(body.description) : undefined,
    coverImageUrl: 'coverImageUrl' in body ? readNullableString(body.coverImageUrl) : undefined,
    promptTexts: 'promptTexts' in body ? readStringArray(body.promptTexts) : undefined,
    tags: 'tags' in body ? readStringArray(body.tags) : undefined,
    publishDate: 'publishDate' in body ? readNullableString(body.publishDate) : undefined,
    featuredImageIds: 'featuredImageIds' in body ? readBigIntArray(body.featuredImageIds) : undefined,
  };
}
