import {
  GENERATION_TYPE,
  getMaximumGenerationImageCount,
  MAX_GENERATION_IMAGE_COUNT,
  type GenerationType,
} from '../constants/generation';
import type { CreateGenerationJobInput } from '../types/generation';
import { isOpenRouterMockEnabled } from '../ai/openrouter-mock';

const DEFAULT_MODEL = 'mock-image-model';
const DEFAULT_IMAGE_COUNT = 1;
const MAX_REFERENCE_IMAGE_COUNT = 4;
const MAX_PROMPT_LENGTH = 4000;
const SOURCE_PAGES = new Set([
  'home',
  'theme_detail',
  'studio',
  'explore_image_detail',
  'theme_gallery',
]);

function readOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readGenerationType(value: unknown): GenerationType {
  if (value === GENERATION_TYPE.TEXT_TO_IMAGE) {
    return value;
  }

  return GENERATION_TYPE.TEXT_TO_IMAGE;
}

function readOptionalBigInt(value: unknown): bigint | undefined {
  const text = readOptionalString(value);
  if (!text || !/^\d+$/.test(text)) {
    return undefined;
  }

  return BigInt(text);
}

function readSourcePage(value: unknown): string | undefined {
  const sourcePage = readOptionalString(value);
  if (!sourcePage) return undefined;
  if (!SOURCE_PAGES.has(sourcePage)) {
    throw new Error('sourcePage is invalid');
  }

  return sourcePage;
}

function readReferenceIds(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('referenceIds must be an array');
  }

  const referenceIds = value.map((item) => {
    const referenceId = readOptionalString(item);
    if (!referenceId) {
      throw new Error('referenceIds must contain non-empty strings');
    }
    return referenceId;
  });

  const uniqueReferenceIds = [...new Set(referenceIds)];
  if (uniqueReferenceIds.length > MAX_REFERENCE_IMAGE_COUNT) {
    throw new Error(`referenceIds can contain at most ${MAX_REFERENCE_IMAGE_COUNT} images`);
  }

  return uniqueReferenceIds;
}

export function parseCreateGenerationJobInput(payload: unknown): CreateGenerationJobInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be an object');
  }

  const body = payload as Record<string, unknown>;
  const prompt = readOptionalString(body.prompt);
  if (!prompt) {
    throw new Error('prompt is required');
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`prompt must be ${MAX_PROMPT_LENGTH} characters or less`);
  }

  const model = readOptionalString(body.model);
  if (!model && !isOpenRouterMockEnabled()) {
    throw new Error('model is required');
  }
  const rawImageCount = typeof body.imageCount === 'number' ? body.imageCount : DEFAULT_IMAGE_COUNT;
  const maximumImageCount = model
    ? getMaximumGenerationImageCount(model)
    : MAX_GENERATION_IMAGE_COUNT;
  const imageCount = Math.min(Math.max(Math.trunc(rawImageCount), 1), maximumImageCount);

  return {
    prompt,
    model: model ?? DEFAULT_MODEL,
    style: readOptionalString(body.style),
    ratio: readOptionalString(body.ratio),
    imageCount,
    generationType: readGenerationType(body.generationType),
    themeId: readOptionalBigInt(body.themeId),
    sourcePage: readSourcePage(body.sourcePage),
    referenceIds: readReferenceIds(body.referenceIds),
  };
}
