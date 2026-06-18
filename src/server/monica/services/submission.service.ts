import { imageRepository } from '../repositories/image.repository';
import { submissionRepository } from '../repositories/submission.repository';
import { themeRepository } from '../repositories/theme.repository';

export class SubmissionService {
  searchImageSubmissions(input: Parameters<typeof imageRepository.searchImageSubmissions>[0]) {
    return imageRepository.searchImageSubmissions(input);
  }

  async submitImage(userId: string, input: { imageId: string; themeId: string; title?: string; creatorNote?: string }) {
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
    const themeId = BigInt(input.themeId);
    const theme = await themeRepository.findPublicThemeById(themeId);
    if (!theme) {
      throw new Error('Theme is not available for submission');
    }

    const job = image.jobId ? await imageRepository.findGenerationJob(image.jobId) : null;
    const existing = await submissionRepository.findExistingSubmission(userId, image.imageId);
    if (existing) {
      return existing;
    }

    return submissionRepository.createForReview({
      userId,
      imageId: image.imageId,
      themeId,
      title: input.title?.slice(0, 255) || input.creatorNote?.slice(0, 255) || 'Untitled image',
      promptSnapshot: job?.prompt ?? null,
      creationNote: input.creatorNote,
    });
  }

  reviewImageSubmission(reviewerUserId: string, submissionId: string, action: 'approved' | 'rejected', note?: string) {
    return submissionRepository.reviewImageSubmission(reviewerUserId, submissionId, action, note);
  }
}

export const submissionService = new SubmissionService();
