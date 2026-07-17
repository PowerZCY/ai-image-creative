import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireMonicaAdmin } from '@/server/monica/auth';
import { submissionService } from '@/server/monica/services/submission.service';
import { themeRepository } from '@/server/monica/repositories/theme.repository';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireMonicaAdmin();
    const { themeId } = await context.params;
    const body = await request.json() as { imageId?: string; title?: string; altText?: string; creationNote?: string };
    if (!body.imageId) {
      return NextResponse.json({ error: 'imageId is required' }, { status: 400 });
    }
    const publicImage = await submissionService.addGeneratedImageToTheme(user.userId, {
      imageId: body.imageId,
      themeId,
      title: body.title,
      altText: body.altText,
      creationNote: body.creationNote,
    });
    const theme = /^\d+$/.test(themeId)
      ? await themeRepository.findAdminThemeById(BigInt(themeId))
      : null;
    if (theme) {
      revalidatePath('/gallery');
      revalidatePath(`/themes/${theme.slug}`);
      revalidatePath(`/images/${publicImage.publicImageId}`);
    }
    return NextResponse.json({ publicImage });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
