import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { exploreService } from '@/server/monica/services/explore.service';
import { themeFeaturedImageRepository } from '@/server/monica/repositories/theme-featured-image.repository';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const authUtils = new ApiAuthUtils(_request);
    await authUtils.requireAuthWithUser();
    const { themeId } = await context.params;
    if (!/^\d+$/.test(themeId)) {
      return NextResponse.json({ error: 'themeId is invalid' }, { status: 400 });
    }

    const [selected, pool] = await Promise.all([
      themeFeaturedImageRepository.listByTheme(BigInt(themeId)),
      exploreService.searchPublicImages({
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

    const body = await request.json() as { publicImageIds?: unknown };
    const publicImageIds = Array.isArray(body.publicImageIds)
      ? body.publicImageIds
        .map((value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '')
        .filter((value) => /^\d+$/.test(value))
        .slice(0, 3)
        .map((value) => BigInt(value))
      : [];

    const selected = await themeFeaturedImageRepository.setForTheme({
      themeId: BigInt(themeId),
      publicImageIds,
      createdBy: user.userId,
    });
    return NextResponse.json({ selected });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
