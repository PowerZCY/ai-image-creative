import { prisma } from '@/server/prisma';
import { Prisma } from '@app-prisma';

export type CreateAssistantInteractionInput = {
  sessionId?: string;
  userId?: string | null;
  createdAsAnonymous?: boolean;
  rootActionType: string;
  actionType: string;
  parentInteractionId?: string | null;
  sourcePage?: string | null;
  themeId?: bigint | null;
  imageId?: string | null;
  publicImageId?: string | null;
  generationJobId?: string | null;
  userInput?: string | null;
  inputPrompt?: string | null;
  outputPrompt?: string | null;
  ideas?: Prisma.InputJsonValue;
  selectedIdeaIndex?: number | null;
  selectedIdea?: Prisma.InputJsonValue;
  requestPayload?: Prisma.InputJsonValue;
  responsePayload?: Prisma.InputJsonValue;
  provider?: string | null;
  model?: string | null;
  status?: string;
  errorMessage?: string | null;
  usedForGeneration?: boolean;
};

export class AssistantInteractionRepository {
  create(input: CreateAssistantInteractionInput) {
    return prisma.assistantInteraction.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId,
        createdAsAnonymous: input.createdAsAnonymous ?? false,
        rootActionType: input.rootActionType,
        actionType: input.actionType,
        parentInteractionId: input.parentInteractionId,
        sourcePage: input.sourcePage,
        themeId: input.themeId,
        imageId: input.imageId,
        publicImageId: input.publicImageId,
        generationJobId: input.generationJobId,
        userInput: input.userInput,
        inputPrompt: input.inputPrompt,
        outputPrompt: input.outputPrompt,
        ideas: input.ideas ?? Prisma.JsonNull,
        selectedIdeaIndex: input.selectedIdeaIndex,
        selectedIdea: input.selectedIdea ?? Prisma.JsonNull,
        requestPayload: input.requestPayload ?? Prisma.JsonNull,
        responsePayload: input.responsePayload ?? Prisma.JsonNull,
        provider: input.provider,
        model: input.model,
        status: input.status ?? 'succeeded',
        errorMessage: input.errorMessage,
        usedForGeneration: input.usedForGeneration ?? false,
      },
    });
  }

  markUsedForGeneration(interactionId: string, generationJobId: string) {
    return prisma.assistantInteraction.update({
      where: { interactionId },
      data: {
        generationJobId,
        usedForGeneration: true,
      },
    });
  }
}

export const assistantInteractionRepository = new AssistantInteractionRepository();
