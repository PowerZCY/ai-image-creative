import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { galleryService } from '@/server/monica/services/gallery.service';
import { themeFeaturedImageRepository } from '@/server/monica/repositories/theme-featured-image.repository';
import { themeRepository } from '@/server/monica/repositories/theme.repository';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeId: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(_request);
    await authUtils.requireAuthWithUser();
    const { themeId } = await context.params;
    if (!/^\d+$/.test(themeId)) {
      return NextResponse.json({ error: 'themeId is invalid' }, { status: 400 });
    }
    const numericThemeId = BigInt(themeId);
    const theme = await themeRepository.findAdminThemeById(numericThemeId);
    if (!theme) {
      return NextResponse.json({ error: 'Theme is not available' }, { status: 400 });
    }

    const [selected, pool] = await Promise.all([
      themeFeaturedImageRepository.listByTheme(numericThemeId),
      galleryService.listPublicImagesPage({
        page: 1,
        pageSize: 80,
        filters: { themeId },
      }),
    ]);

    return NextResponse.json({ selected, pool: pool.items });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const { themeId } = await context.params;
    if (!/^\d+$/.test(themeId)) {
      return NextResponse.json({ error: 'themeId is invalid' }, { status: 400 });
    }
    const numericThemeId = BigInt(themeId);
    const theme = await themeRepository.findAdminThemeById(numericThemeId);
    if (!theme) {
      return NextResponse.json({ error: 'Theme is not available' }, { status: 400 });
    }

    const body = await request.json() as { publicImageIds?: unknown };
    const publicImageIds = Array.isArray(body.publicImageIds)
      ? body.publicImageIds
        .map((value) => typeof value === 'string' ? value : '')
        .filter(Boolean)
        .slice(0, 3)
      : [];
    if (publicImageIds.some((publicImageId) => !UUID_PATTERN.test(publicImageId))) {
      return NextResponse.json({ error: 'publicImageIds must be UUID strings' }, { status: 400 });
    }

    const selected = await themeFeaturedImageRepository.setForTheme({
      themeId: numericThemeId,
      publicImageIds,
      createdBy: user.userId,
    });
    revalidatePath('/themes');
    revalidatePath(`/themes/${theme.slug}`);
    return NextResponse.json({ selected });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
