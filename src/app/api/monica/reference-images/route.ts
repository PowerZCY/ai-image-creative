import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { referenceImageService } from '@/server/monica/services/reference-image.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { buildStoredImageUrl } from '@/server/monica/utils/image-url';
import { resolveMonicaActor } from '@/server/monica/auth';

installBigIntJsonSerialization();

function readOptionalJsonString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalJsonNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function getUploadErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('storageKey is required')) {
    return 400;
  }
  if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('unauthenticated')) {
    return 401;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await resolveMonicaActor(request);

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'content-type must be application/json' }, { status: 415 });
    }

    const body = await request.json() as Record<string, unknown>;
    const storageKey = readOptionalJsonString(body.storageKey);
    if (!storageKey) {
      return NextResponse.json({ error: 'storageKey is required' }, { status: 400 });
    }

    const referenceImage = await referenceImageService.createReferenceImage(actor.user.userId, {
      storageKey,
      cdnImagePrefix: readOptionalJsonString(body.cdnImagePrefix),
      mimeType: readOptionalJsonString(body.mimeType),
      width: readOptionalJsonNumber(body.width),
      height: readOptionalJsonNumber(body.height),
    });

    return NextResponse.json({
      referenceImage: {
        referenceId: referenceImage.referenceId,
        url: buildStoredImageUrl(referenceImage),
        mimeType: referenceImage.mimeType,
        safetyStatus: referenceImage.safetyStatus,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[monica/reference-images] upload failed', error);
    return NextResponse.json({ error: message }, { status: getUploadErrorStatus(error) });
  }
}
