import { GENERATION_TYPE, type GenerationType } from '../constants/generation';
import type { CreateGenerationJobInput } from '../types/generation';

const DEFAULT_MODEL = 'mock-image-model';
const DEFAULT_IMAGE_COUNT = 1;
const MAX_IMAGE_COUNT = 4;
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

  const rawImageCount = typeof body.imageCount === 'number' ? body.imageCount : DEFAULT_IMAGE_COUNT;
  const imageCount = Math.min(Math.max(Math.trunc(rawImageCount), 1), MAX_IMAGE_COUNT);

  return {
    prompt,
    negativePrompt: readOptionalString(body.negativePrompt),
    model: readOptionalString(body.model) ?? DEFAULT_MODEL,
    style: readOptionalString(body.style),
    ratio: readOptionalString(body.ratio),
    imageCount,
    generationType: readGenerationType(body.generationType),
    themeId: readOptionalBigInt(body.themeId),
    sourcePage: readSourcePage(body.sourcePage),
    referenceId: readOptionalString(body.referenceId),
  };
}
