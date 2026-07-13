import type { ThemeSubmissionStatus } from '../constants/theme';
import { themeRepository } from '../repositories/theme.repository';

export class ThemeService {
  listPublicThemes() {
    return themeRepository.listPublicThemes();
  }

  listPublicThemesPage(input: Parameters<typeof themeRepository.listPublicThemesPage>[0]) {
    return themeRepository.listPublicThemesPage(input);
  }

  listPublicThemesCursor(input: Parameters<typeof themeRepository.listPublicThemesCursor>[0]) {
    return themeRepository.listPublicThemesCursor(input);
  }

  searchAdminThemes(input: Parameters<typeof themeRepository.searchAdminThemes>[0]) {
    return themeRepository.searchAdminThemes(input);
  }

  findPublicThemeBySlug(slug: string) {
    return themeRepository.findPublicThemeBySlug(slug);
  }

  findPublicThemeById(themeId: bigint) {
    return themeRepository.findPublicThemeById(themeId);
  }

  updateAdminTheme(themeId: string, input: Parameters<typeof themeRepository.updateAdminTheme>[1]) {
    return themeRepository.updateAdminTheme(themeId, input);
  }

  createAdminTheme(input: Parameters<typeof themeRepository.createAdminTheme>[0]) {
    return themeRepository.createAdminTheme(input);
  }

  searchSubmissions(input: Parameters<typeof themeRepository.searchSubmissions>[0]) {
    return themeRepository.searchSubmissions(input);
  }

  createSubmission(userId: string, input: Parameters<typeof themeRepository.createSubmission>[1]) {
    return themeRepository.createSubmission(userId, input);
  }

  reviewSubmission(reviewerUserId: string, themeSubmissionId: string, status: ThemeSubmissionStatus, reason?: string) {
    return themeRepository.reviewSubmission(reviewerUserId, themeSubmissionId, status, reason);
  }

  publishFromSubmission(reviewerUserId: string, themeSubmissionId: string, input: Parameters<typeof themeRepository.publishFromSubmission>[2]) {
    return themeRepository.publishFromSubmission(reviewerUserId, themeSubmissionId, input);
  }
}

export const themeService = new ThemeService();
