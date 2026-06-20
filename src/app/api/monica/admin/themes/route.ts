import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { ApiAuthUtils } from '@windrun-huaiin/backend-core/auth/server';
import { themeService } from '@/server/monica/services/theme.service';
import { parseAdminThemeCreateInput } from '@/server/monica/validators/theme.validator';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const authUtils = new ApiAuthUtils(request);
    await authUtils.requireAuthWithUser();
    const body = await request.json() as Record<string, unknown>;
    const input = parseAdminThemeCreateInput(body);
    const theme = await themeService.createAdminTheme(input);
    return NextResponse.json({ theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
