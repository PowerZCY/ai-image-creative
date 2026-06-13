import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { generationService } from '@/server/monica/services/generation.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const { jobId } = await context.params;
    const job = await generationService.getGenerationJob(user.userId, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Generation job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
