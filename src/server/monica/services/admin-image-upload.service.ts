import { randomUUID } from 'node:crypto';
import { Prisma } from '@app-prisma';
import { adminImageUploadRepository } from '../repositories/admin-image-upload.repository';
import { themeFeaturedImageRepository } from '../repositories/theme-featured-image.repository';
import { themeRepository } from '../repositories/theme.repository';
import { r2StorageService } from '../storage/r2-storage.service';
import {
  extensionForImageMimeType,
  isAllowedUploadImageMimeType,
  readImageDimensions,
} from '../utils/image-metadata';
import { buildStoredImageUrl } from '../utils/image-url';

const DEFAULT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export type UploadAdminImageInput = {
  themeId: string;
  file: File;
  title?: string;
  altText?: string;
  model?: string;
  creationNote?: string;
  prompt?: string;
  tags?: string[];
  setFeatured?: boolean;
};

export class AdminImageUploadService {
  async uploadImageToTheme(adminUserId: string, input: UploadAdminImageInput) {
    if (!/^\d+$/.test(input.themeId)) {
      throw new Error('themeId is required');
    }

    const themeId = BigInt(input.themeId);
    const theme = await themeRepository.findPublicThemeById(themeId);
    if (!theme) {
      throw new Error('Theme is not available');
    }

    const mimeType = input.file.type || 'application/octet-stream';
    if (!isAllowedUploadImageMimeType(mimeType)) {
      throw new Error('Please upload a JPG, PNG, WEBP, or GIF image.');
    }

    const maxBytes = readUploadMaxBytes();
    if (input.file.size > maxBytes) {
      throw new Error(`Please select an image file less than ${Math.floor(maxBytes / 1024 / 1024)}MB.`);
    }

    const title = input.title?.trim().slice(0, 255);
    if (!title) {
      throw new Error('Title is required');
    }

    const bytes = new Uint8Array(await input.file.arrayBuffer());
    const dimensions = readImageDimensions(bytes, mimeType);
    const storageKey = createAdminLocalUploadStorageKey(mimeType);

    const uploadResult = await r2StorageService.uploadGeneratedImage({
      storageKey,
      body: bytes.buffer,
      contentType: mimeType,
    });

    const result = await adminImageUploadRepository.createPublishedWithPublicImage({
      adminUserId,
      themeId,
      storageKey: uploadResult.storageKey,
      mimeType,
      fileSize: input.file.size,
      width: dimensions.width,
      height: dimensions.height,
      title,
      altText: normalizeNullableText(input.altText, 255),
      model: normalizeNullableText(input.model, 100),
      creationNote: normalizeNullableText(input.creationNote),
      prompt: normalizeNullableText(input.prompt),
      tags: normalizeTags(input.tags) as Prisma.InputJsonValue,
      metadata: {
        r2: {
          storedFilename: uploadResult.storageKey,
          uploadSuccess: uploadResult.result.success,
        },
      },
    });

    if (input.setFeatured) {
      const current = await themeFeaturedImageRepository.listByTheme(themeId);
      const publicImageIds = [
        result.publicImage.publicImageId,
        ...current.map((item) => item.publicImageId).filter((id) => id !== result.publicImage.publicImageId),
      ].slice(0, 3);
      await themeFeaturedImageRepository.setForTheme({
        themeId,
        publicImageIds,
        createdBy: adminUserId,
      });
    }

    return {
      ...result,
      imageUrl: buildStoredImageUrl(result.upload),
    };
  }
}

export const adminImageUploadService = new AdminImageUploadService();

function createAdminLocalUploadStorageKey(mimeType: string) {
  const ext = extensionForImageMimeType(mimeType);
  const random = randomUUID().replace(/-/g, '').slice(0, 8);
  return `l/${Date.now()}-${random}.${ext}`;
}

function normalizeNullableText(value?: string, maxLength?: number) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function readUploadMaxBytes() {
  const fromEnv = Number(process.env.NEXT_PUBLIC_R2_UPLOAD_IMAGE_MAX_SIZE);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv * 1024 * 1024;
  }
  return DEFAULT_UPLOAD_MAX_BYTES;
}
