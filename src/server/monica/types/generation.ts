import type { GenerationType } from '../constants/generation';

export type CreateGenerationJobInput = {
  prompt: string;
  negativePrompt?: string;
  model: string;
  style?: string;
  ratio?: string;
  imageCount: number;
  generationType?: GenerationType;
  sourcePage?: string;
  sessionId?: string;
  themeId?: string;
  referenceId?: string;
  sourceImageId?: string;
  editInstruction?: string;
};

export type ImageGenerationProviderInput = {
  jobId: string;
  prompt: string;
  negativePrompt?: string | null;
  model: string;
  style?: string | null;
  ratio?: string | null;
  imageCount: number;
  referenceImageUrl?: string;
};

export type ImageGenerationProviderImage = {
  index: number;
  storageKey: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
};

export type ImageGenerationProviderResult = {
  provider: string;
  providerJobId?: string;
  images: ImageGenerationProviderImage[];
  responseSummary?: Record<string, unknown>;
};

export type QstashGenerationPayload = {
  jobId: string;
};
