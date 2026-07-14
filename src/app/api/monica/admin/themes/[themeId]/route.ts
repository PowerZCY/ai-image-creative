import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { galleryService } from '@/server/monica/services/gallery.service';
import { themeService } from '@/server/monica/services/theme.service';
import { parseAdminThemeUpdateInput } from '@/server/monica/validators/theme.validator';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(request);
    await authUtils.requireAuthWithUser();
    const { themeId } = await context.params;
    if (!/^\d+$/.test(themeId)) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }
    const previousTheme = await themeService.findAdminThemeById(BigInt(themeId));
    const body = await request.json() as Record<string, unknown>;
    const input = parseAdminThemeUpdateInput(body);
    const theme = await themeService.updateAdminTheme(themeId, input);
    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }
    revalidatePath('/themes');
    if (previousTheme && previousTheme.slug !== theme.slug) {
      revalidatePath(`/themes/${previousTheme.slug}`);
    }
    revalidatePath(`/themes/${theme.slug}`);
    const publicImageIds = await galleryService.listPublicImageIdsByThemeId(theme.id);
    for (const publicImageId of publicImageIds) {
      revalidatePath(`/images/${publicImageId}`);
    }

    return NextResponse.json({ theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
