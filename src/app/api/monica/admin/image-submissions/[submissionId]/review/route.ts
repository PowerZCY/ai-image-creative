import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { submissionService } from '@/server/monica/services/submission.service';
import { themeRepository } from '@/server/monica/repositories/theme.repository';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const { submissionId } = await params;
    const body = await request.json() as { action?: string; note?: string; altText?: string };
    if (body.action !== 'approved' && body.action !== 'rejected') {
      return NextResponse.json({ error: 'Invalid review action' }, { status: 400 });
    }

    const submission = await submissionService.reviewImageSubmission(
      user.userId,
      submissionId,
      body.action,
      typeof body.note === 'string' ? body.note : undefined,
      typeof body.altText === 'string' ? body.altText : undefined,
    );

    if (!submission) {
      return NextResponse.json({ error: 'Image submission not found' }, { status: 404 });
    }

    if (submission.publicImage) {
      const theme = submission.publicImage.themeId
        ? await themeRepository.findAdminThemeById(submission.publicImage.themeId)
        : null;
      revalidatePath('/gallery');
      if (theme) revalidatePath(`/themes/${theme.slug}`);
      revalidatePath(`/images/${submission.publicImage.publicImageId}`);
    }

    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
