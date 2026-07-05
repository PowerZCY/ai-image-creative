import { SAFETY_STATUS } from '../constants/safety';
import type { ImageGenerationProviderResult } from '../types/generation';
import type { SafetyResult } from '../types/safety';

const BLOCKED_KEYWORDS = ['child sexual', 'terrorist instruction'];

export class SafetyService {
  async checkGenerationRequest(input: { prompt: string }): Promise<SafetyResult> {
    const prompt = input.prompt.toLowerCase();
    const blockedKeyword = BLOCKED_KEYWORDS.find((keyword) => prompt.includes(keyword));
    if (blockedKeyword) {
      return {
        status: SAFETY_STATUS.BLOCKED,
        source: 'basic_rule',
        reasonCode: 'blocked_keyword',
        detail: { keyword: blockedKeyword },
      };
    }

    return {
      status: SAFETY_STATUS.SKIPPED,
      source: 'basic_rule',
      reasonCode: 'mvp_lightweight_safety',
    };
  }

  async checkProviderResult(_input: ImageGenerationProviderResult): Promise<SafetyResult> {
    return {
      status: SAFETY_STATUS.SKIPPED,
      source: 'provider_policy',
      reasonCode: 'provider_policy_trusted_in_mvp',
    };
  }

  async checkReferenceImages(_input: { referenceIds?: string[]; mimeType?: string | null }): Promise<SafetyResult> {
    return {
      status: SAFETY_STATUS.SKIPPED,
      source: 'basic_rule',
      reasonCode: 'mvp_reference_image_safety',
    };
  }
}

export const safetyService = new SafetyService();
