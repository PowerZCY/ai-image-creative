import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { UserStatus } from '@windrun-huaiin/backend-core/database';
import { generationService } from '@/server/monica/services/generation.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { parseCreateGenerationJobInput } from '@/server/monica/validators/generation.validator';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const body = await request.json();
    const input = parseCreateGenerationJobInput(body);
    const result = await generationService.createGenerationJob(
      user.userId,
      input,
      user.status === UserStatus.ANONYMOUS,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Insufficient credits')
      ? 402
      : message.includes('Generation request is already in progress')
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
