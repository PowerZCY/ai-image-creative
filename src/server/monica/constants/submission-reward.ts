export const THEME_SUBMISSION_APPROVAL_REWARD = {
  amount: 20,
  feature: 'theme_submission_approval_reward',
  operationReferId: (submissionId: bigint) => `theme-submission-approved:${submissionId}`,
} as const;

export const IMAGE_SUBMISSION_APPROVAL_REWARD = {
  amount: 10,
  feature: 'image_submission_approval_reward',
  operationReferId: (submissionId: bigint) => `image-submission-approved:${submissionId}`,
} as const;
