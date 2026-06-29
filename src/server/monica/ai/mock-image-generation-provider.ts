import type { ImageGenerationProvider } from './image-generation-provider';
import type {
  ImageGenerationProviderInput,
  ImageGenerationProviderResult,
} from '../types/generation';

const MOCK_IMAGE_WIDTH = 1024;
const MOCK_IMAGE_HEIGHT = 1024;

function readMockTimeoutMs() {
  const seconds = Number(process.env.OPENROUTER_MOCK_TIMEOUT_SECONDS ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return seconds * 1000;
}

async function delay(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function applyMockMode() {
  const mode = process.env.OPENROUTER_MOCK_TYPE?.trim() || '0';
  const timeoutMs = readMockTimeoutMs();

  if (mode === '0') {
    await delay(timeoutMs);
    return;
  }
  if (mode === '1') {
    await delay(timeoutMs || 5000);
    return;
  }
  if (mode === '2') {
    await delay(timeoutMs || 1000);
    throw new Error('OpenRouter mock timeout');
  }
  if (mode === '3') {
    await delay(timeoutMs || 500);
    throw new Error('OpenRouter mock partial timeout');
  }
  if (mode === '4') {
    await delay(timeoutMs || 500);
    throw new Error('OpenRouter mock partial aborted');
  }
  if (mode === '5') {
    await delay(timeoutMs || 500);
    throw new Error('OpenRouter mock partial interrupted');
  }
}

export class MockImageGenerationProvider implements ImageGenerationProvider {
  async createGeneration(input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult> {
    await applyMockMode();

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
    };
  }
}

export const mockImageGenerationProvider = new MockImageGenerationProvider();
