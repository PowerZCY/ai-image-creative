import type { ImageGenerationProvider } from './image-generation-provider';
import type {
  ImageGenerationProviderImage,
  ImageGenerationProviderInput,
  ImageGenerationProviderResult,
} from '../types/generation';
import {
  getOpenRouterModelSlug,
  sendOpenRouterChatCompletion,
  type OpenRouterChatCompletionResult,
  type OpenRouterChatContentItem,
} from './openrouter-client';

type ExtractedImage = {
  source: 'url' | 'data_url' | 'base64';
  value: string;
};

type PreparedImage = {
  body: ArrayBuffer;
  contentType: string;
  extension: string;
  sourceUrl?: string;
};

const DATA_URL_PATTERN = /^data:([^;,]+);base64,([\s\S]+)$/;
const IMAGE_URL_PATTERN = /(https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s)"']*)?)/gi;

function extensionFromContentType(contentType: string) {
  const clean = contentType.split(';')[0].trim().toLowerCase();
  if (clean === 'image/png') return 'png';
  if (clean === 'image/webp') return 'webp';
  if (clean === 'image/gif') return 'gif';
  if (clean === 'image/jpeg' || clean === 'image/jpg') return 'jpg';
  return 'png';
}

function isProbablyBase64Image(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 256) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.includes(' ')) return false;
  return /^[a-z0-9+/=\r\n]+$/i.test(trimmed);
}

function extractImagesFromUnknown(value: unknown, images: ExtractedImage[], seen = new Set<unknown>()) {
  if (!value) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (DATA_URL_PATTERN.test(trimmed)) {
      images.push({ source: 'data_url', value: trimmed });
      return;
    }
    if (isProbablyBase64Image(trimmed)) {
      images.push({ source: 'base64', value: trimmed });
      return;
    }

    for (const match of trimmed.matchAll(IMAGE_URL_PATTERN)) {
      if (match[1]) {
        images.push({ source: 'url', value: match[1] });
      }
    }
    return;
  }

  if (typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      extractImagesFromUnknown(item, images, seen);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  const candidate = record.url ?? record.imageUrl ?? record.image_url ?? record.b64_json ?? record.base64;
  extractImagesFromUnknown(candidate, images, seen);

  for (const nested of Object.values(record)) {
    if (nested !== candidate) {
      extractImagesFromUnknown(nested, images, seen);
    }
  }
}

function extractProviderImages(result: OpenRouterChatCompletionResult) {
  const images: ExtractedImage[] = [];
  for (const choice of result.choices) {
    extractImagesFromUnknown(choice.message.images, images);
    extractImagesFromUnknown(choice.message.content, images);
  }

  const deduped = new Map<string, ExtractedImage>();
  for (const image of images) {
    if (!deduped.has(image.value)) {
      deduped.set(image.value, image);
    }
  }

  return [...deduped.values()];
}

async function prepareImage(image: ExtractedImage): Promise<PreparedImage> {
  if (image.source === 'url') {
    const response = await fetch(image.value);
    if (!response.ok) {
      throw new Error(`Failed to download provider image: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type')?.split(';')[0].trim() || 'image/png';
    if (!contentType.startsWith('image/')) {
      throw new Error(`Provider image URL returned non-image content type: ${contentType}`);
    }

    return {
      body: await response.arrayBuffer(),
      contentType,
      extension: extensionFromContentType(contentType),
      sourceUrl: image.value,
    };
  }

  const dataUrlMatch = image.source === 'data_url' ? image.value.match(DATA_URL_PATTERN) : null;
  const contentType = dataUrlMatch?.[1] || 'image/png';
  const base64 = dataUrlMatch?.[2] || image.value;
  const buffer = Buffer.from(base64.replace(/\s+/g, ''), 'base64');
  if (!buffer.byteLength) {
    throw new Error('Provider returned empty base64 image data');
  }

  return {
    body: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    contentType,
    extension: extensionFromContentType(contentType),
  };
}

function buildPrompt(input: ImageGenerationProviderInput, imageOrdinal: number) {
  const parts = [
    input.prompt,
    input.ratio ? `Aspect ratio: ${input.ratio}.` : null,
    input.style ? `Style: ${input.style}.` : null,
    input.imageCount > 1 ? `Create image ${imageOrdinal + 1} of ${input.imageCount}; keep it distinct while following the same brief.` : null,
    'Return the generated image as an image output.',
  ];

  return parts.filter(Boolean).join('\n');
}

function buildUserContent(input: ImageGenerationProviderInput, imageOrdinal: number): Array<OpenRouterChatContentItem> {
  const content: Array<OpenRouterChatContentItem> = [
    {
      type: 'text',
      text: buildPrompt(input, imageOrdinal),
    },
  ];

  for (const referenceImageUrl of input.referenceImageUrls ?? []) {
    content.push({
      type: 'image_url',
      imageUrl: {
        url: referenceImageUrl,
        detail: 'high',
      },
    });
  }

  return content;
}

export class OpenRouterImageGenerationProvider implements ImageGenerationProvider {
  async createGeneration(input: ImageGenerationProviderInput): Promise<ImageGenerationProviderResult> {
    const modelSlug = getOpenRouterModelSlug(input.model);
    const imageCount = Math.max(1, Math.min(input.imageCount, 4));
    const images: ImageGenerationProviderImage[] = [];
    const providerJobIds: string[] = [];

    for (let index = 0; index < imageCount; index += 1) {
      const result = await sendOpenRouterChatCompletion({
        model: modelSlug,
        messages: [
          {
            role: 'system',
            content: 'You are an image generation model. Follow the user brief and output generated image data.',
          },
          {
            role: 'user',
            content: buildUserContent(input, index),
          },
        ],
        modalities: ['image'],
        temperature: 1,
        metadata: {
          jobId: input.jobId,
          modelKey: input.model,
          imageIndex: String(index),
        },
      });
      providerJobIds.push(result.id);

      const providerImages = extractProviderImages(result);
      const providerImage = providerImages[0];
      if (!providerImage) {
        throw new Error('Provider returned no deliverable images');
      }

      const prepared = await prepareImage(providerImage);

      images.push({
        index,
        binaryData: prepared.body,
        mimeType: prepared.contentType,
        metadata: {
          provider: 'openrouter',
          providerImageSource: providerImage.source,
          providerSourceUrl: prepared.sourceUrl,
          providerImageExtension: prepared.extension,
          model: modelSlug,
          modelKey: input.model,
          prompt: input.prompt,
          ratio: input.ratio,
          openrouterResponseId: result.id,
          openrouterModel: result.model,
          usage: result.usage,
        },
      });
    }

    return {
      provider: 'openrouter',
      providerJobId: providerJobIds.join(','),
      images,
    };
  }
}

export const openRouterImageGenerationProvider = new OpenRouterImageGenerationProvider();
