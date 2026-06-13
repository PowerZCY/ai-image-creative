export const THEME_SUBMISSION_STATUS = {
  DRAFT: 'draft',
  UNDER_REVIEW: 'under_review',
  ACCEPTED_TO_POOL: 'accepted_to_pool',
  REJECTED: 'rejected',
  DUPLICATE: 'duplicate',
  SELECTED: 'selected',
  PUBLISHED: 'published',
} as const;

export const THEME_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type ThemeSubmissionStatus = (typeof THEME_SUBMISSION_STATUS)[keyof typeof THEME_SUBMISSION_STATUS];
export type ThemeStatus = (typeof THEME_STATUS)[keyof typeof THEME_STATUS];
