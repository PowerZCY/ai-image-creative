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

export const TERMINAL_GENERATION_STATUSES = new Set<string>([
  GENERATION_STATUS.SUCCEEDED,
  GENERATION_STATUS.FAILED,
  GENERATION_STATUS.BLOCKED,
  GENERATION_STATUS.CANCELLED,
]);

export type GenerationStatus = (typeof GENERATION_STATUS)[keyof typeof GENERATION_STATUS];
export type GenerationType = (typeof GENERATION_TYPE)[keyof typeof GENERATION_TYPE];
