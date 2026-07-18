import type { ImageGenerationProvider } from './image-generation-provider';
import type {
  ImageGenerationProviderImage,
  ImageGenerationProviderInput,
  ImageGenerationProviderResult,
} from '../types/generation';
import { getMaximumGenerationImageCount } from '../constants/generation';
import {
  getOpenRouterModelSlug,
  sendOpenRouterImageGeneration,
} from './openrouter-client';
import type { ImageGenerationRequest } from '@openrouter/sdk/models';

const FALLBACK_IMAGE_MIME_TYPE = 'image/png';

function toImageBinaryData(base64: string) {
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.byteLength) {
    throw new Error('OpenRouter returned empty image data');
  }

  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export class OpenRouterImageGenerationProvider implements ImageGenerationProvider {
  async createGeneration(input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult> {
    const maxImageCount = getMaximumGenerationImageCount(input.model);
    if (input.imageCount > maxImageCount) {
      throw new Error(`${input.model} supports at most ${maxImageCount} image per request`);
    }

    const modelSlug = getOpenRouterModelSlug(input.model);
    const result = await sendOpenRouterImageGeneration({
      model: modelSlug,
      prompt: input.prompt,
      n: input.imageCount,
      aspectRatio: input.ratio as ImageGenerationRequest['aspectRatio'],
      inputReferences: input.referenceImageUrls?.map((url) => ({
        type: 'image_url',
        imageUrl: { url },
      })),
    });

    if (result.data.length !== input.imageCount) {
      throw new Error(`OpenRouter returned ${result.data.length} images; expected ${input.imageCount}`);
    }

    const images: ImageGenerationProviderImage[] = result.data.map((image, index) => ({
      index,
      binaryData: toImageBinaryData(image.b64Json),
      mimeType: image.mediaType ?? FALLBACK_IMAGE_MIME_TYPE,
      metadata: {
        provider: 'openrouter',
        model: modelSlug,
        modelKey: input.model,
        prompt: input.prompt,
        ratio: input.ratio,
        openrouterCreatedAt: result.created,
        usage: result.usage,
      },
    }));

    return {
      provider: 'openrouter',
      images,
    };
  }
}

export const openRouterImageGenerationProvider = new OpenRouterImageGenerationProvider();
