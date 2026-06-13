import type { ImageGenerationProvider } from './image-generation-provider';
import type {
  ImageGenerationProviderInput,
  ImageGenerationProviderResult,
} from '../types/generation';

const MOCK_IMAGE_WIDTH = 1024;
const MOCK_IMAGE_HEIGHT = 1024;

export class MockImageGenerationProvider implements ImageGenerationProvider {
  async createGeneration(input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult> {
    const imageCount = Math.max(1, Math.min(input.imageCount, 4));

    return {
      provider: 'mock',
      providerJobId: `mock_${input.jobId}`,
      images: Array.from({ length: imageCount }, (_, index) => ({
        index,
        storageKey: `mock/generated/${input.jobId}/${index}.jpg`,
        imageUrl: `https://picsum.photos/seed/monica-${input.jobId}-${index}/${MOCK_IMAGE_WIDTH}/${MOCK_IMAGE_HEIGHT}`,
        thumbnailUrl: `https://picsum.photos/seed/monica-${input.jobId}-${index}/512/512`,
        width: MOCK_IMAGE_WIDTH,
        height: MOCK_IMAGE_HEIGHT,
        metadata: {
          mock: true,
          prompt: input.prompt,
          model: input.model,
          style: input.style,
          ratio: input.ratio,
        },
      })),
      responseSummary: {
        mock: true,
        imageCount,
      },
    };
  }
}

export const mockImageGenerationProvider = new MockImageGenerationProvider();
