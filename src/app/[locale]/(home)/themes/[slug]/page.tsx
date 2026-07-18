import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createLocalizedPageMetadata, createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaGalleryCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { MonicaPricingModalProvider } from '@/components/monica/monica-pricing-modal-provider';
import { monicaContentWidthClass } from '@/components/monica/layout';
import { GalleryClient } from '@/components/monica/gallery-client';
import { appConfig } from '@/lib/appConfig';
import { themeService } from '@/server/monica/services/theme.service';
import { galleryService } from '@/server/monica/services/gallery.service';
import { ArrowLeft } from 'lucide-react';
import { moneyPriceConfig } from '@windrun-huaiin/backend-core/config/money-price';
import { buildMoneyPriceData } from '@windrun-huaiin/third-ui/main/money-price/server';

export const revalidate = 14400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [site, theme] = await Promise.all([
    createLocalizedSiteMetadata({
      locale,
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    }),
    themeService.findPublicThemeBySlug(slug),
  ]);

  if (!theme) {
    return createLocalizedPageMetadata({
      url: {
        locale,
        pathname: `/themes/${slug}`,
        baseUrl: appConfig.baseUrl,
        locales: appConfig.i18n.locales,
        defaultLocale: appConfig.i18n.defaultLocale,
        localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
      },
      site,
    });
  }

  const title = theme.seoTitle ?? theme.title;
  const description = theme.seoMetaDescription ?? theme.description ?? theme.brief ?? undefined;
  const imageUrl = theme.seoOgImageUrl ?? theme.coverImageUrl ?? undefined;

  return createLocalizedPageMetadata({
    url: {
      locale,
      pathname: `/themes/${theme.slug}`,
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    },
    site,
    page: {
      title,
      description,
      keywords: theme.seoKeywords,
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

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [creatorCopy, themeCopy, galleryCopy, pricingData] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
    getMonicaGalleryCopy(locale),
    buildMoneyPriceData({
      locale,
      currency: moneyPriceConfig.display.currency,
      enabledBillingTypes: ['onetime'],
    }),
  ]);
  const dbTheme = await themeService.findPublicThemeBySlug(slug);

  if (!dbTheme) {
    notFound();
  }

  const gallery = await galleryService.listPublicImagesPage({
    page: 1,
    pageSize: 20,
    sortBy: 'featured',
    filters: { themeId: dbTheme.id.toString() },
  });

  const title = dbTheme.title;
  const description = dbTheme.description ?? dbTheme.brief ?? themeCopy.homeDescription;
  const tags = dbTheme.tags as string[];
  const starterIdeas = dbTheme.generatorIdeas ?? [];

  return (
    <div className="monica-surface min-h-screen">
      <section className="px-4 pb-8 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6">
            <Link href="/themes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to themes
            </Link>
          </div>
          <h1 className="text-4xl font-medium leading-tight text-foreground md:text-5xl">
            {title}
          </h1>
          {description ? (
            <div className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {description}
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div className="mx-auto mt-6 flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground/70">
              {tags.map((tag, index) => (
                <span key={tag} className="flex items-center gap-2">
                  <span>{tag}</span>
                  {index < tags.length - 1 ? <span aria-hidden="true">&bull;</span> : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <MonicaPricingModalProvider data={pricingData} config={moneyPriceConfig}>
        <MonicaCreator
          copy={creatorCopy}
          themeId={dbTheme.id}
          themeLabel={dbTheme.title}
          themeNote={dbTheme.description}
          sourcePage="theme_detail"
          mode="theme_detail"
          starterIdeas={starterIdeas}
        />
      </MonicaPricingModalProvider>

      <section className="px-4 pt-16 pb-24 md:px-8">
        <div className={monicaContentWidthClass}>
          <GalleryClient
            copy={galleryCopy}
            initialItems={gallery.items}
            initialPagination={gallery.pagination}
            filters={{ themeId: dbTheme.id.toString() }}
            sortBy="featured"
            heading={{ title: themeCopy.galleryTitle, level: 'h2' }}
          />
        </div>
      </section>
    </div>
  );
}
