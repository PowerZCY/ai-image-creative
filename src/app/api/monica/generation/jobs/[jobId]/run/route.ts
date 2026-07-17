import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { generationService } from '@/server/monica/services/generation.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { resolveMonicaActor } from '@/server/monica/auth';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await resolveMonicaActor(request);
    const { jobId } = await context.params;
    const job = await generationService.runOwnedGenerationJob(actor.user.userId, jobId);

    if (!job) {
      return NextResponse.json({ error: 'Generation job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Generation job not found') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
