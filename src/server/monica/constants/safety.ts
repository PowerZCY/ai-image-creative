export const SAFETY_STATUS = {
  PASSED: 'passed',
  BLOCKED: 'blocked',
  NEEDS_REVIEW: 'needs_review',
  SKIPPED: 'skipped',
} as const;

export type SafetyStatus = (typeof SAFETY_STATUS)[keyof typeof SAFETY_STATUS];
