import type { ImageGenerationProvider } from './image-generation-provider';
import { mockImageGenerationProvider } from './mock-image-generation-provider';
import { openRouterImageGenerationProvider } from './openrouter-image-generation-provider';

export function getImageGenerationProvider(): ImageGenerationProvider {
  if (process.env.OPENROUTER_MOCK_TYPE?.trim()) {
    return mockImageGenerationProvider;
  }

  return openRouterImageGenerationProvider;
}
