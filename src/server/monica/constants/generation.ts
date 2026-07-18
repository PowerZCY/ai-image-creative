export const GENERATION_QUEUE_NAME = 'monica_generation';

export const GENERATION_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
} as const;

export const GENERATION_TYPE = {
  TEXT_TO_IMAGE: 'text_to_image',
} as const;

export const GENERATION_FEATURE = {
  IMAGE_GENERATION: 'ai_image_generation',
} as const;

export const GENERATION_CREDITS_PER_IMAGE_BY_MODEL = {
  'gpt-image-2': 2,
  'nano-banana-2': 2,
  'nano-banana-pro': 2,
  'seedream-4.5': 1,
} as const;

export const MAX_GENERATION_IMAGE_COUNT = 4;
const SINGLE_IMAGE_GENERATION_MODELS = new Set([
  'nano-banana-2',
  'nano-banana-pro',
]);

export function getMaximumGenerationImageCount(model: string) {
  return SINGLE_IMAGE_GENERATION_MODELS.has(model) ? 1 : MAX_GENERATION_IMAGE_COUNT;
}

export function getGenerationCreditsPerImage(model: string) {
  return GENERATION_CREDITS_PER_IMAGE_BY_MODEL[
    model as keyof typeof GENERATION_CREDITS_PER_IMAGE_BY_MODEL
  ] ?? 2;
}

export function estimateGenerationCredits(model: string, imageCount: number) {
  const normalizedImageCount = Number.isFinite(imageCount) ? Math.max(1, Math.trunc(imageCount)) : 1;
  return normalizedImageCount * getGenerationCreditsPerImage(model);
}

export const TERMINAL_GENERATION_STATUSES = new Set<string>([
  GENERATION_STATUS.SUCCEEDED,
  GENERATION_STATUS.FAILED,
  GENERATION_STATUS.BLOCKED,
  GENERATION_STATUS.CANCELLED,
]);

export type GenerationStatus = (typeof GENERATION_STATUS)[keyof typeof GENERATION_STATUS];
export type GenerationType = (typeof GENERATION_TYPE)[keyof typeof GENERATION_TYPE];
