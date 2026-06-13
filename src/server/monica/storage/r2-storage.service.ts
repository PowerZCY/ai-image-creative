import { createR2Client } from '@/lib/r2-explorer-sdk';

const DEFAULT_REFERENCE_SHARE_HOURS = 24;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getR2Client() {
  return createR2Client({
    baseUrl: requireEnv('R2_BASE_URL'),
    bucketName: requireEnv('R2_BUCKET_NAME'),
    apiToken: requireEnv('R2_API_TOKEN'),
  });
}

export class R2StorageService {
  async createProviderAccessibleImageUrl(storageKey: string) {
    const client = getR2Client();
    const shareUrls = await client.share(storageKey, DEFAULT_REFERENCE_SHARE_HOURS);
    return shareUrls.public.view;
  }
}

export const r2StorageService = new R2StorageService();
