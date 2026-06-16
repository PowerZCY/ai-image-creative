import { imageRepository } from '../repositories/image.repository';
import { submissionRepository } from '../repositories/submission.repository';

export class SubmissionService {
  searchImageSubmissions(input: Parameters<typeof imageRepository.searchImageSubmissions>[0]) {
    return imageRepository.searchImageSubmissions(input);
  }

  async submitImage(userId: string, input: { imageId: string; title?: string; creatorNote?: string }) {
    const image = await imageRepository.findOwnedGeneratedImage(userId, input.imageId);
    if (!image) {
      throw new Error('Generated image not found');
    }

    if (image.isLocked || (image.status !== 'generated' && image.status !== 'rejected')) {
      throw new Error('Generated image is locked and cannot be submitted');
    }

    const job = image.jobId ? await imageRepository.findGenerationJob(image.jobId) : null;
    if (!job?.themeId) {
      throw new Error('Image must be associated with a theme before submission');
    }

    const existing = await submissionRepository.findExistingSubmission(userId, image.imageId);
    if (existing) {
      return existing;
    }

    return submissionRepository.createForReview({
      userId,
      imageId: image.imageId,
      themeId: job.themeId,
      title: input.title?.slice(0, 255) || input.creatorNote?.slice(0, 255) || 'Untitled image',
      promptSnapshot: job.prompt,
      creationNote: input.creatorNote,
    });
  }

  reviewImageSubmission(reviewerUserId: string, submissionId: string, action: 'approved' | 'rejected', note?: string) {
    return submissionRepository.reviewImageSubmission(reviewerUserId, submissionId, action, note);
  }
}

export const submissionService = new SubmissionService();
