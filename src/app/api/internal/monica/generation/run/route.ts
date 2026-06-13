import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { verifyQstashSignature } from '@windrun-huaiin/backend-core/upstash/server';
import { generationService } from '@/server/monica/services/generation.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

function getQstashSignatureUrl() {
  const url = process.env.NEXT_PUBLIC_QSTASH_GENERATE_IMAGE_TASK_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_QSTASH_GENERATE_IMAGE_TASK_URL is required to verify QStash generation callbacks');
  }

  return url;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    const signature = request.headers.get('upstash-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing upstash-signature header' }, { status: 401 });
    }

    await verifyQstashSignature({
      signature,
      body: rawBody,
      url: getQstashSignatureUrl(),
    });

    const envelope = generationService.parseQstashEnvelope(rawBody);
    const job = await generationService.runGenerationJob(envelope.payload.jobId);

    return NextResponse.json({
      ok: true,
      jobId: envelope.payload.jobId,
      status: job?.status ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
