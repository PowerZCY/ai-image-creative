import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { submissionService } from '@/server/monica/services/submission.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const body = await request.json() as { imageId?: string; themeId?: string; title?: string; creatorNote?: string };
    if (!body.imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }
    if (!body.themeId) {
      return NextResponse.json({ error: 'themeId is required' }, { status: 400 });
    }

    const submission = await submissionService.submitImage(user.userId, {
      imageId: body.imageId,
      themeId: body.themeId,
      title: typeof body.title === 'string' ? body.title : undefined,
      creatorNote: typeof body.creatorNote === 'string' ? body.creatorNote : undefined,
    });

    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
