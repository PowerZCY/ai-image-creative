import '@/server/prisma';
import { NextResponse } from 'next/server';
import { themeService } from '@/server/monica/services/theme.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function GET() {
  try {
    const themes = await themeService.listPublicThemes();
    return NextResponse.json({ themes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
