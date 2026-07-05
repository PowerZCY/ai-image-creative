import type { GenerationType } from '../constants/generation';

export type CreateGenerationJobInput = {
  prompt: string;
  model: string;
  style?: string;
  ratio?: string;
  imageCount: number;
  generationType?: GenerationType;
  themeId?: bigint;
  sourcePage?: string;
  referenceIds?: string[];
};

export type ImageGenerationProviderInput = {
  jobId: string;
  prompt: string;
  model: string;
  style?: string | null;
  ratio?: string | null;
  imageCount: number;
  referenceImageUrls?: string[];
};

export type ImageGenerationProviderImage = {
  index: number;
  storageKey?: string;
  cdnImagePrefix?: string;
  imageUrl?: string;
  binaryData?: ArrayBuffer;
  mimeType?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
};

export type ImageGenerationProviderResult = {
  provider: string;
  providerJobId?: string;
  images: ImageGenerationProviderImage[];
};

export type QstashGenerationPayload = {
  jobId: string;
};
