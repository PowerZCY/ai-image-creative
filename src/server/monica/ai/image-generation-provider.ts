import type {
  ImageGenerationProviderInput,
  ImageGenerationProviderResult,
} from '../types/generation';

export interface ImageGenerationProvider {
  createGeneration(input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult>;
}
