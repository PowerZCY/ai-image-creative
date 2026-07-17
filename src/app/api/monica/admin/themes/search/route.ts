import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { requireMonicaAdmin } from '@/server/monica/auth';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';
import type { MonicaPagedRequest } from '@/server/monica/types/pagination';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    await requireMonicaAdmin();
    const body = await request.json() as MonicaPagedRequest;
    const result = await themeService.searchAdminThemes(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
