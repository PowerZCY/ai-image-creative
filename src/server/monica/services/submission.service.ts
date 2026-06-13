import { imageRepository } from '../repositories/image.repository';
import { submissionRepository } from '../repositories/submission.repository';

export class SubmissionService {
  async submitImage(userId: string, input: { imageId: string; creatorNote?: string }) {
    const image = await imageRepository.findOwnedGeneratedImage(userId, input.imageId);
    if (!image) {
      throw new Error('Generated image not found');
    }
    if (!image.themeId) {
      throw new Error('Image must be associated with a theme before submission');
    }

    const existing = await submissionRepository.findExistingSubmission(userId, image.imageId);
    if (existing) {
      return existing;
    }

    return submissionRepository.createAndPublish({
      userId,
      imageId: image.imageId,
      themeId: image.themeId,
      promptSnapshot: image.promptUsed,
      creatorNote: input.creatorNote,
    });
  }
}

export const submissionService = new SubmissionService();
