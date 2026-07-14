import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createLocalizedPageMetadata, createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { getMonicaGalleryCopy } from '@/components/monica/copy-server';
import { PublicImageDetailView } from '@/components/monica/public-image-detail-view';
import { appConfig } from '@/lib/appConfig';
import { galleryService } from '@/server/monica/services/gallery.service';

type ImageDetailPageProps = {
  params: Promise<{ locale: string; publicImageId: string }>;
};

export const revalidate = 14400;

export async function generateMetadata({ params }: ImageDetailPageProps): Promise<Metadata> {
  const { locale, publicImageId } = await params;
  const [site, publicImage] = await Promise.all([
    createLocalizedSiteMetadata({
      locale,
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    }),
    galleryService.findPublicImageDetail(publicImageId),
  ]);

  const pathname = `/images/${publicImageId}`;
  if (!publicImage) {
    return createLocalizedPageMetadata({
      url: {
        locale,
        pathname,
        baseUrl: appConfig.baseUrl,
        locales: appConfig.i18n.locales,
        defaultLocale: appConfig.i18n.defaultLocale,
        localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
      },
      site,
    });
  }

  const title = publicImage.title;
  const description = publicImage.creationNote ?? publicImage.altText ?? undefined;
  const imageUrl = publicImage.image?.imageUrl ?? undefined;

  return createLocalizedPageMetadata({
    url: {
      locale,
      pathname,
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    },
    site,
    page: {
      title,
      description,
      openGraph: {
        title,
        description,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
      },
      twitter: {
        title,
        description,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
      },
    },
  });
}

export default async function PublicImageDetailPage({ params }: ImageDetailPageProps) {
  const { locale, publicImageId } = await params;
  const [copy, publicImage] = await Promise.all([
    getMonicaGalleryCopy(locale),
    galleryService.findPublicImageDetail(publicImageId),
  ]);

  if (!publicImage) {
    notFound();
  }

  const imageUrl = publicImage.image?.imageUrl;
  const imageObject = imageUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        name: publicImage.title,
        description: publicImage.creationNote ?? publicImage.altText ?? undefined,
        contentUrl: imageUrl,
        thumbnailUrl: publicImage.image?.thumbnailUrl ?? imageUrl,
        width: publicImage.image?.width ?? undefined,
        height: publicImage.image?.height ?? undefined,
      }
    : null;

  return (
    <main className="monica-surface min-h-screen">
      {imageObject ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageObject) }}
        />
      ) : null}

      <PublicImageDetailView publicImage={publicImage} copy={copy} closeMode="gallery" />
    </main>
  );
}
