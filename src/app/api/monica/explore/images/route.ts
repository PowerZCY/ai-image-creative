import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { exploreService } from '@/server/monica/services/explore.service';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

export async function GET(request: NextRequest) {
  try {
    const sort = request.nextUrl.searchParams.get('sort') ?? undefined;
    const images = await exploreService.listPublicImages({ sort });
    return NextResponse.json({ images });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
