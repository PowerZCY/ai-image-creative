import { notFound } from 'next/navigation';
import { BodyScrollLock } from '@/components/monica/body-scroll-lock';
import { getMonicaGalleryCopy } from '@/components/monica/copy-server';
import { PublicImageDetailView } from '@/components/monica/public-image-detail-view';
import { galleryService } from '@/server/monica/services/gallery.service';

type InterceptedImageDetailPageProps = {
  params: Promise<{ locale: string; publicImageId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function InterceptedImageDetailPage({ params }: InterceptedImageDetailPageProps) {
  const { locale, publicImageId } = await params;
  const [copy, publicImage] = await Promise.all([
    getMonicaGalleryCopy(locale),
    galleryService.findPublicImageDetail(publicImageId),
  ]);

  if (!publicImage) {
    notFound();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-(--monica-bg)">
      <BodyScrollLock />
      <PublicImageDetailView
        publicImage={publicImage}
        copy={copy}
        closeMode="back"
        className="min-h-screen w-full bg-(--monica-bg)"
      />
    </div>
  );
}
