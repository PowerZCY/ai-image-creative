import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { getOptionalServerAuthUser } from '@windrun-huaiin/backend-core/auth/server';
import { submissionService } from '@/server/monica/services/submission.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import { MONICA_ERROR_CODE, monicaError } from '@/server/monica/api-error';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const authenticated = await getOptionalServerAuthUser();
    if (!authenticated) {
      return monicaError(MONICA_ERROR_CODE.LOGIN_REQUIRED, 'Create an account to submit an image.', 403);
    }
    const body = await request.json() as { imageId?: string; themeId?: string; title?: string; creatorNote?: string };
    if (!body.imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }
    if (!body.themeId) {
      return NextResponse.json({ error: 'themeId is required' }, { status: 400 });
    }
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'English title is required' }, { status: 400 });
    }

    const submission = await submissionService.submitImage(authenticated.user.userId, {
      imageId: body.imageId,
      themeId: body.themeId,
      title: body.title,
      creatorNote: typeof body.creatorNote === 'string' ? body.creatorNote : undefined,
    });

    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('already been submitted') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
