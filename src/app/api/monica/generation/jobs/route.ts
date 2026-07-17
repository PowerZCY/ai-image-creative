import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { generationService } from '@/server/monica/services/generation.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parseCreateGenerationJobInput } from '@/server/monica/validators/generation.validator';
import { MonicaLoginRequiredError, resolveMonicaActor } from '@/server/monica/auth';
import { MONICA_ERROR_CODE, monicaError } from '@/server/monica/api-error';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  let isAnonymous = false;
  try {
    const actor = await resolveMonicaActor(request);
    isAnonymous = actor.isAnonymous;
    const body = await request.json();
    const input = parseCreateGenerationJobInput(body);
    const result = await generationService.createGenerationJob(
      actor.user.userId,
      input,
      actor.isAnonymous,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MonicaLoginRequiredError) {
      return monicaError(MONICA_ERROR_CODE.LOGIN_REQUIRED, 'Create an account to continue.', 403);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Insufficient credits')) {
      return monicaError(
        isAnonymous
          ? MONICA_ERROR_CODE.ANONYMOUS_CREDITS_EXHAUSTED
          : MONICA_ERROR_CODE.INSUFFICIENT_CREDITS,
        isAnonymous
          ? 'Create an account to continue generating images.'
          : 'You do not have enough credits to generate this image.',
        402,
      );
    }
    const status = message.includes('Generation request is already in progress')
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
