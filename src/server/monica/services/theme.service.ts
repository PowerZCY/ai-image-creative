import type { ThemeSubmissionStatus } from '../constants/theme';
import { themeRepository } from '../repositories/theme.repository';

export class ThemeService {
  listPublicThemes() {
    return themeRepository.listPublicThemes();
  }

  findPublicThemeBySlug(slug: string) {
    return themeRepository.findPublicThemeBySlug(slug);
  }

  listSubmissions(input: Parameters<typeof themeRepository.listSubmissions>[0]) {
    return themeRepository.listSubmissions(input);
  }

  listMySubmissions(userId: string) {
    return themeRepository.listMySubmissions(userId);
  }

  createSubmission(userId: string, input: Parameters<typeof themeRepository.createSubmission>[1]) {
    return themeRepository.createSubmission(userId, input);
  }

  updateOwnedDraft(userId: string, themeSubmissionId: string, input: Parameters<typeof themeRepository.updateOwnedDraft>[2]) {
    return themeRepository.updateOwnedDraft(userId, themeSubmissionId, input);
  }

  submitOwnedDraft(userId: string, themeSubmissionId: string) {
    return themeRepository.submitOwnedDraft(userId, themeSubmissionId);
  }

  reviewSubmission(reviewerUserId: string, themeSubmissionId: string, status: ThemeSubmissionStatus, reason?: string) {
    return themeRepository.reviewSubmission(reviewerUserId, themeSubmissionId, status, reason);
  }

  publishFromSubmission(reviewerUserId: string, themeSubmissionId: string, input: Parameters<typeof themeRepository.publishFromSubmission>[2]) {
    return themeRepository.publishFromSubmission(reviewerUserId, themeSubmissionId, input);
  }
}

export const themeService = new ThemeService();
