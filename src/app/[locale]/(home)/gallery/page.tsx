import type { Metadata } from 'next';
import { createLocalizedPageMetadata, createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { GalleryClient } from '@/components/monica/gallery-client';
import { getMonicaGalleryCopy } from '@/components/monica/copy-server';
import { appConfig } from '@/lib/appConfig';
import { galleryService } from '@/server/monica/services/gallery.service';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [site, copy] = await Promise.all([
    createLocalizedSiteMetadata({
      locale,
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    }),
    getMonicaGalleryCopy(locale),
  ]);

  return createLocalizedPageMetadata({
    url: {
      locale,
      pathname: '/gallery',
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    },
    site,
    page: {
      title: copy.title,
      description: copy.description,
      openGraph: { title: copy.title, description: copy.description },
      twitter: { title: copy.title, description: copy.description },
    },
  });
}

export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [copy, gallery] = await Promise.all([
    getMonicaGalleryCopy(locale),
    galleryService.listPublicImagesPage({
      page: 1,
      pageSize: 20,
      sortBy: 'newest',
      filters: {},
    }),
  ]);

  return <GalleryClient copy={copy} initialItems={gallery.items} initialPagination={gallery.pagination} />;
}
