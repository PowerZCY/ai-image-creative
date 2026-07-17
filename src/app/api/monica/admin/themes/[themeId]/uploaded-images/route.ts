import '@/server/prisma';
import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireMonicaAdmin } from '@/server/monica/auth';
import { adminImageUploadService } from '@/server/monica/services/admin-image-upload.service';
import { themeService } from '@/server/monica/services/theme.service';
import { themeRepository } from '@/server/monica/repositories/theme.repository';
import { installBigIntJsonSerialization } from '@/server/monica/utils/bigint-json';

installBigIntJsonSerialization();

type RouteContext = {
  params: Promise<{ themeId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await requireMonicaAdmin();
    const { themeId } = await context.params;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const setFeatured = readFormString(formData, 'setFeatured') === 'true';

    const result = await adminImageUploadService.uploadImageToTheme(user.userId, {
      themeId,
      file,
      title: readFormString(formData, 'title'),
      altText: readFormString(formData, 'altText'),
      model: readFormString(formData, 'model'),
      creationNote: readFormString(formData, 'creationNote'),
      prompt: readFormString(formData, 'prompt'),
      tags: readTags(formData),
      setFeatured,
    });
    if (/^\d+$/.test(themeId)) {
      const theme = await themeRepository.findAdminThemeById(BigInt(themeId));
      if (theme) {
        revalidatePath('/gallery');
        revalidatePath('/themes');
        revalidatePath(`/themes/${theme.slug}`);
        revalidatePath(`/images/${result.publicImage.publicImageId}`);
        if (setFeatured && await themeService.isCurrentHomeTheme(theme.id)) {
          revalidatePath('/[locale]', 'page');
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

function readTags(formData: FormData) {
  const value = readFormString(formData, 'tags');
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Fall through to newline/comma parsing.
  }
  return value
    .split(/[\n,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}
