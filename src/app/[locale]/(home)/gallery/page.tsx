import { GalleryClient } from '@/components/monica/gallery-client';
import { getMonicaGalleryCopy } from '@/components/monica/copy-server';

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = await getMonicaGalleryCopy(locale);

  return <GalleryClient copy={copy} />;
}
