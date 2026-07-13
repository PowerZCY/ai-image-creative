import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { cursor?: { publishDate?: unknown; id?: unknown }; pageSize?: unknown; filter?: unknown };
    const cursor = body.cursor && typeof body.cursor.publishDate === 'string' && typeof body.cursor.id === 'string'
      ? { publishDate: body.cursor.publishDate, id: body.cursor.id }
      : undefined;
    const pageSize = typeof body.pageSize === 'number' ? body.pageSize : undefined;
    const filter = body.filter === 'featured' || body.filter === 'open' ? body.filter : 'all';
    const result = await themeService.listPublicThemesCursor({ cursor, pageSize, filter });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
