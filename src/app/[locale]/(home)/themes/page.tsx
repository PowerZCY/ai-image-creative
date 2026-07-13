import type { Metadata } from 'next';
import { createLocalizedPageMetadata, createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { ThemesIndexClient } from '@/components/monica/themes-index-client';
import { getMonicaThemesCopy } from '@/components/monica/copy-server';
import type { SharedThemeItem } from '@/components/monica/theme-discovery-card';
import { appConfig } from '@/lib/appConfig';
import { themeService } from '@/server/monica/services/theme.service';

export const revalidate = 14400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [site, copy] = await Promise.all([
    createLocalizedSiteMetadata({
      locale,
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    }),
    getMonicaThemesCopy(locale),
  ]);

  return createLocalizedPageMetadata({
    url: {
      locale,
      pathname: '/themes',
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

export default async function ThemesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [copy, themes] = await Promise.all([
    getMonicaThemesCopy(locale),
    themeService.listPublicThemesCursor({ pageSize: 20 }),
  ]);

  return (
    <ThemesIndexClient
      copy={copy}
      initialItems={themes.items.map(serializeTheme)}
      initialNextCursor={themes.nextCursor}
      initialHasMore={themes.hasMore}
    />
  );
}

function serializeTheme(theme: Awaited<ReturnType<typeof themeService.listPublicThemesCursor>>['items'][number]): SharedThemeItem {
  return {
    id: theme.id.toString(),
    issueNumber: theme.issueNumber,
    title: theme.title,
    brief: theme.brief,
    description: theme.description,
    coverImageUrl: theme.coverImageUrl,
    slug: theme.slug,
    publishDate: theme.publishDate?.toISOString() ?? null,
    featuredImages: theme.featuredImages.map((image) => image && ({
      id: image.id,
      imageUrl: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl,
      title: image.title,
      altText: image.altText,
    })),
  };
}
