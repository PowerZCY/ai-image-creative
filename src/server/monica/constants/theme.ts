export const THEME_SUBMISSION_STATUS = {
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

export const THEME_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
} as const;

export type ThemeSubmissionStatus = (typeof THEME_SUBMISSION_STATUS)[keyof typeof THEME_SUBMISSION_STATUS];
export type ThemeStatus = (typeof THEME_STATUS)[keyof typeof THEME_STATUS];
