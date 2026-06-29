import { OpenRouter } from '@openrouter/sdk';
import type { ChatRequest, ChatResult } from '@openrouter/sdk/models';

const DEFAULT_TIMEOUT_SECONDS = 120;

function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function requireEnv(name: string) {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function readTimeoutMs() {
  const raw = readOptionalEnv('OPENROUTER_TIMEOUT_SECONDS');
  if (!raw) return DEFAULT_TIMEOUT_SECONDS * 1000;

  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error('OPENROUTER_TIMEOUT_SECONDS must be a positive number');
  }

  return Math.round(seconds * 1000);
}

let cachedClient: OpenRouter | null = null;

export type OpenRouterChatContentItem =
  | {
    type: 'text';
    text: string;
  }
  | {
    type: 'image_url';
    imageUrl: {
      url: string;
      detail?: 'auto' | 'low' | 'high';
    };
  };

export type OpenRouterChatCompletionResult = ChatResult;

function getOpenRouterClient() {
  if (cachedClient) return cachedClient;

  const timeoutMs = readTimeoutMs();
  cachedClient = new OpenRouter({
    apiKey: requireEnv('OPENROUTER_API_KEY'),
    appTitle: readOptionalEnv('OPENROUTER_SITE_NAME') ?? 'Monica AI',
    timeoutMs,
  });

  return cachedClient;
}

function normalizeOpenRouterError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export async function sendOpenRouterChatCompletion(chatRequest: ChatRequest): Promise<ChatResult> {
  try {
    const request = {
      chatRequest: {
        ...chatRequest,
        stream: false as const,
      },
    };
    return await getOpenRouterClient().chat.send(request, {
      timeoutMs: readTimeoutMs(),
      retryCodes: ['5XX', '429'],
    });
  } catch (error) {
    throw new Error(`OpenRouter request failed: ${normalizeOpenRouterError(error)}`);
  }
}

export function getOpenRouterModelSlug(modelKey: string) {
  const rawMap = readOptionalEnv('OPENROUTER_IMAGE_MODEL_MAP');
  if (!rawMap) {
    throw new Error('OPENROUTER_IMAGE_MODEL_MAP is required');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawMap);
  } catch {
    throw new Error('OPENROUTER_IMAGE_MODEL_MAP must be valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('OPENROUTER_IMAGE_MODEL_MAP must be a JSON object');
  }

  const slug = (parsed as Record<string, unknown>)[modelKey];
  if (typeof slug !== 'string' || !slug.trim()) {
    throw new Error(`Unknown image model key: ${modelKey}`);
  }

  return slug.trim();
}

export function getOpenRouterPromptModelSlug() {
  return readOptionalEnv('OPENROUTER_PROMPT_MODEL') ?? 'openai/gpt-5.2';
}
