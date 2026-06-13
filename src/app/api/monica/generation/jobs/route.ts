import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
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
    const job = await generationService.createGenerationJob(user.userId, input);

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Insufficient credits') ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
