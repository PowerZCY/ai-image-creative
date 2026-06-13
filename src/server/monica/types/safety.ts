import type { SafetyStatus } from '../constants/safety';

export type SafetyResult = {
  status: SafetyStatus;
  source: 'basic_rule' | 'provider_policy' | 'manual' | 'external_moderation';
  reasonCode?: string;
  detail?: Record<string, unknown>;
};
