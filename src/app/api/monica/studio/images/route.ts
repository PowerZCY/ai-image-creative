import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { studioService } from '@/server/monica/services/studio.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function GET(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    const { user } = await authUtils.requireAuthWithUser();
    const images = await studioService.listMyImages(user.userId);
    return NextResponse.json({ images });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
