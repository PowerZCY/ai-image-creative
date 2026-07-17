import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireMonicaAdmin } from '@/server/monica/auth';
import { themeService } from '@/server/monica/services/theme.service';
import { parseAdminThemeCreateInput } from '@/server/monica/validators/theme.validator';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    await requireMonicaAdmin();
    const body = await request.json() as Record<string, unknown>;
    const input = parseAdminThemeCreateInput(body);
    const theme = await themeService.createAdminTheme(input);
    if (await themeService.isCurrentHomeTheme(theme.id)) {
      revalidatePath('/[locale]', 'page');
    }
    return NextResponse.json({ theme });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
