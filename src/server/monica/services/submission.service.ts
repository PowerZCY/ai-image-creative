import { imageRepository } from '../repositories/image.repository';
import { submissionRepository } from '../repositories/submission.repository';
import { themeRepository } from '../repositories/theme.repository';

export class SubmissionService {
  searchImageSubmissions(input: Parameters<typeof imageRepository.searchImageSubmissions>[0]) {
    return imageRepository.searchImageSubmissions(input);
  }

  searchGeneratedImagesForAdmin(input: Parameters<typeof imageRepository.searchGeneratedImagesForAdmin>[0]) {
    return imageRepository.searchGeneratedImagesForAdmin(input);
  }

  async addGeneratedImageToTheme(adminUserId: string, input: { imageId: string; themeId: string; title?: string; altText?: string; creationNote?: string }) {
    if (!/^\d+$/.test(input.themeId)) {
      throw new Error('themeId is required');
    }
    const image = await imageRepository.findGeneratedImage(input.imageId);
    if (!image) {
      throw new Error('Generated image not found');
    }
    const themeId = BigInt(input.themeId);
    const theme = await themeRepository.findPublicThemeById(themeId);
    if (!theme) {
      throw new Error('Theme is not available');
    }
    const job = image.jobId ? await imageRepository.findGenerationJob(image.jobId) : null;
    return submissionRepository.createPublicImageDirect({
      imageId: image.imageId,
      userId: image.userId,
      themeId,
      title: input.title?.trim().slice(0, 255) || 'Admin selected image',
      altText: normalizePublicImageAltText(input.altText),
      creationNote: input.creationNote ?? job?.prompt ?? null,
      createdBy: adminUserId,
    });
  }

  async submitImage(userId: string, input: { imageId: string; themeId: string; title: string; creatorNote?: string }) {
    const image = await imageRepository.findOwnedGeneratedImage(userId, input.imageId);
    if (!image) {
      throw new Error('Generated image not found');
    }

    if (image.isLocked || (image.status !== 'generated' && image.status !== 'rejected')) {
      throw new Error('Generated image is locked and cannot be submitted');
    }

    if (!/^\d+$/.test(input.themeId)) {
      throw new Error('themeId is required');
    }
    const title = input.title.trim();
    if (!title) {
      throw new Error('English title is required');
    }

    const themeId = BigInt(input.themeId);
    const theme = await themeRepository.findPublicThemeById(themeId);
    if (!theme) {
      throw new Error('Theme is not available for submission');
    }

    const job = image.jobId ? await imageRepository.findGenerationJob(image.jobId) : null;
    const existing = await submissionRepository.findExistingSubmission(userId, image.imageId);
    if (existing) {
      throw new Error('This image has already been submitted. Please choose another image.');
    }

    return submissionRepository.createForReview({
      userId,
      imageId: image.imageId,
      themeId,
      title: title.slice(0, 255),
      promptSnapshot: job?.prompt ?? null,
      creationNote: input.creatorNote,
    });
  }

  reviewImageSubmission(reviewerUserId: string, submissionId: string, action: 'approved' | 'rejected', note?: string, altText?: string) {
    return submissionRepository.reviewImageSubmission(reviewerUserId, submissionId, action, note, normalizePublicImageAltText(altText));
  }
}

export const submissionService = new SubmissionService();

function normalizePublicImageAltText(value?: string) {
  const normalized = value?.trim().slice(0, 255);
  return normalized || null;
}
