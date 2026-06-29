import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { assistantService, type AssistantPromptIdea, type AssistantPromptMessage, type AssistantPromptMode } from '@/server/monica/services/assistant.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

const MODES = new Set<AssistantPromptMode>(['ideas', 'improve', 'ask']);
const SOURCE_PAGES = new Set([
  'home',
  'theme_detail',
  'studio',
  'explore_image_detail',
  'theme_gallery',
]);
const MESSAGE_ROLES = new Set(['user', 'assistant']);
const MAX_MESSAGES = 10;
const MAX_EXISTING_IDEAS = 10;
const MAX_EXISTING_IDEA_TEXT_LENGTH = 500;
const MAX_PREVIOUS_IMPROVED_PROMPTS = 5;
const MAX_PREVIOUS_IMPROVED_PROMPT_LENGTH = 1000;

function readOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readMode(value: unknown): AssistantPromptMode {
  const mode = readOptionalString(value);
  if (!mode || !MODES.has(mode as AssistantPromptMode)) {
    throw new Error('mode is invalid');
  }
  return mode as AssistantPromptMode;
}

function readOptionalBigInt(value: unknown) {
  const text = readOptionalString(value);
  if (!text || !/^\d+$/.test(text)) return undefined;
  return BigInt(text);
}

function readSourcePage(value: unknown) {
  const sourcePage = readOptionalString(value);
  if (!sourcePage) return undefined;
  if (!SOURCE_PAGES.has(sourcePage)) {
    throw new Error('sourcePage is invalid');
  }
  return sourcePage;
}

function readMessages(value: unknown, mode: AssistantPromptMode): AssistantPromptMessage[] | undefined {
  if (mode !== 'ask' || !Array.isArray(value)) return undefined;

  const messages = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const role = readOptionalString(record.role);
      const text = readOptionalString(record.text);
      if (!role || !MESSAGE_ROLES.has(role) || !text) return null;

      return {
        role: role as AssistantPromptMessage['role'],
        text,
      };
    })
    .filter((message): message is AssistantPromptMessage => Boolean(message));

  return messages.slice(-MAX_MESSAGES);
}

function readExistingIdeas(value: unknown, mode: AssistantPromptMode): AssistantPromptIdea[] | undefined {
  if (mode !== 'ideas' || !Array.isArray(value)) return undefined;

  const ideas = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const idea = readOptionalString(record.idea)?.slice(0, MAX_EXISTING_IDEA_TEXT_LENGTH);
      const prompt = readOptionalString(record.prompt)?.slice(0, MAX_EXISTING_IDEA_TEXT_LENGTH);
      if (!idea && !prompt) return null;

      return {
        idea: idea ?? prompt ?? '',
        prompt: prompt ?? idea ?? '',
      };
    })
    .filter((idea): idea is AssistantPromptIdea => Boolean(idea));

  return ideas.slice(-MAX_EXISTING_IDEAS);
}

function readPreviousImprovedPrompts(value: unknown, mode: AssistantPromptMode) {
  if (mode !== 'improve' || !Array.isArray(value)) return undefined;

  const prompts = value
    .map((item) => readOptionalString(item)?.slice(0, MAX_PREVIOUS_IMPROVED_PROMPT_LENGTH))
    .filter((item): item is string => Boolean(item));

  return prompts.length ? prompts.slice(-MAX_PREVIOUS_IMPROVED_PROMPTS) : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
    }

    const body = await request.json() as Record<string, unknown>;
    const mode = readMode(body.mode);
    const result = await assistantService.createPromptAssistance({
      userId: user.userId,
      mode,
      prompt: readOptionalString(body.prompt),
      userInput: readOptionalString(body.userInput),
      messages: readMessages(body.messages, mode),
      existingIdeas: readExistingIdeas(body.existingIdeas, mode),
      previousImprovedPrompts: readPreviousImprovedPrompts(body.previousImprovedPrompts, mode),
      themeLabel: readOptionalString(body.themeLabel),
      themeNote: readOptionalString(body.themeNote),
      themeId: readOptionalBigInt(body.themeId),
      sourcePage: readSourcePage(body.sourcePage),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
