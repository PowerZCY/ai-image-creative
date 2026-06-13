import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { referenceImageService } from '@/server/monica/services/reference-image.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

function readOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const referenceImage = await referenceImageService.uploadReferenceImage(user.userId, {
      file,
      sessionId: readOptionalString(formData.get('sessionId')),
    });

    return NextResponse.json({ referenceImage });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
