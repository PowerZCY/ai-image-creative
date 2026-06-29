import { createR2Client } from '@/lib/r2-explorer-sdk';

const DEFAULT_REFERENCE_SHARE_HOURS = 24;

function requireR2Env(name: 'BASE_URL' | 'BUCKET_NAME' | 'API_TOKEN') {
  const publicName = `NEXT_PUBLIC_R2_${name}`;
  const value = process.env[publicName];
  if (!value) {
    throw new Error(`${publicName} is required`);
  }
  return value;
}

function getR2Client() {
  return createR2Client({
    baseUrl: requireR2Env('BASE_URL'),
    bucketName: requireR2Env('BUCKET_NAME'),
    apiToken: requireR2Env('API_TOKEN'),
  });
}

export class R2StorageService {
  async createProviderAccessibleImageUrl(storageKey: string) {
    const client = getR2Client();
    const shareUrls = await client.share(storageKey, DEFAULT_REFERENCE_SHARE_HOURS);
    return shareUrls.public.view;
  }

  async uploadGeneratedImage(input: {
    storageKey: string;
    body: ArrayBuffer | Blob;
    contentType: string;
  }) {
    const client = getR2Client();
    const result = await client.upload(input.storageKey, input.body, input.contentType);
    const storageKey = result.file.storedFilename || input.storageKey;
    const imageUrl = result.share_urls?.public?.view || result.share_urls?.protected?.view;

    if (!result.success) {
      throw new Error('R2 generated image upload failed');
    }
    if (!imageUrl) {
      throw new Error('R2 generated image upload did not return a view URL');
    }

    return {
      storageKey,
      imageUrl,
      result,
    };
  }
}

export const r2StorageService = new R2StorageService();
