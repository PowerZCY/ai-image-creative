import type { ImageGenerationProvider } from './image-generation-provider';
import { mockImageGenerationProvider } from './mock-image-generation-provider';
import { isOpenRouterMockEnabled } from './openrouter-mock';
import { openRouterImageGenerationProvider } from './openrouter-image-generation-provider';

export function getImageGenerationProvider(): ImageGenerationProvider {
  if (isOpenRouterMockEnabled()) {
    return mockImageGenerationProvider;
  }

  return openRouterImageGenerationProvider;
}
