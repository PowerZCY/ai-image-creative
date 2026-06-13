import { createR2Client } from '@/lib/r2-explorer-sdk';

const DEFAULT_REFERENCE_SHARE_HOURS = 24;

export type UploadedReferenceImage = {
  storageKey: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getR2Client() {
  return createR2Client({
    baseUrl: requireEnv('R2_EXPLORER_BASE_URL'),
    bucketName: requireEnv('R2_EXPLORER_BUCKET_NAME'),
    apiToken: requireEnv('R2_EXPLORER_API_TOKEN'),
  });
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getExtension(filename: string, mimeType: string) {
  const fromName = filename.includes('.') ? filename.split('.').pop() : undefined;
  if (fromName && /^[a-z0-9]{1,12}$/i.test(fromName)) {
    return fromName.toLowerCase();
  }

  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
}

export class R2StorageService {
  async uploadReferenceImage(userId: string, file: File): Promise<UploadedReferenceImage> {
    const mimeType = file.type || 'application/octet-stream';
    if (!mimeType.startsWith('image/')) {
      throw new Error('Only image files are supported');
    }

    const ext = getExtension(file.name, mimeType);
    const safeName = sanitizeFilenamePart(file.name.replace(/\.[^.]+$/, '')) || 'reference';
    const storageKey = `monica/reference-images/${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}.${ext}`;
    const client = getR2Client();
    const uploadResult = await client.upload(storageKey, file, mimeType);

    return {
      storageKey: uploadResult.file.storedFilename || storageKey,
      url: uploadResult.share_urls.public.view || uploadResult.share_urls.protected.view,
      mimeType,
    };
  }

  async createProviderAccessibleImageUrl(storageKey: string) {
    const client = getR2Client();
    const shareUrls = await client.share(storageKey, DEFAULT_REFERENCE_SHARE_HOURS);
    return shareUrls.public.view;
  }
}

export const r2StorageService = new R2StorageService();
