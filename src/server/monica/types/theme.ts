import { Prisma } from '@app-prisma';

export type ThemeGeneratorIdea = {
  idea: string;
  prompt: string;
};

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeGeneratorIdeas(value: unknown): ThemeGeneratorIdea[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const text = readText(item);
        return text ? { idea: text, prompt: text } : null;
      }

      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const idea = readText(record.idea);
      const prompt = readText(record.prompt);
      if (!idea && !prompt) return null;

      return {
        idea: idea || prompt,
        prompt: prompt || idea,
      };
    })
    .filter((item): item is ThemeGeneratorIdea => Boolean(item));
}

export function generatorIdeasToJson(ideas: ThemeGeneratorIdea[]): Prisma.InputJsonValue {
  return ideas.map((idea) => ({
    idea: idea.idea,
    prompt: idea.prompt,
  })) satisfies Prisma.InputJsonValue;
}
