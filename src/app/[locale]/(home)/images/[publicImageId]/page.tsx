import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Hash } from 'lucide-react';
import { createLocalizedPageMetadata, createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { PublicImageCloseButton, PublicImageDetailActions } from '@/components/monica/public-image-detail-actions';
import { getMonicaExploreCopy } from '@/components/monica/copy-server';
import { appConfig } from '@/lib/appConfig';
import { exploreService } from '@/server/monica/services/explore.service';

type ImageDetailPageProps = {
  params: Promise<{ locale: string; publicImageId: string }>;
};

export const dynamic = 'force-dynamic';

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
    exploreService.findPublicImageDetail(publicImageId),
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
    getMonicaExploreCopy(locale),
    exploreService.findPublicImageDetail(publicImageId),
  ]);

  if (!publicImage) {
    notFound();
  }

  const imageUrl = publicImage.image?.imageUrl;
  const imageAlt = publicImage.altText || publicImage.title;
  const promptText = publicImage.promptUsed || publicImage.title;
  const imageWidth = publicImage.image?.width ?? 1400;
  const imageHeight = publicImage.image?.height ?? 1400;
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

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,440px)]">
        <section className="relative flex min-h-[58vh] items-center justify-center bg-neutral-100/70 p-4 md:p-8 lg:min-h-screen">
          <div className="absolute right-4 top-4 lg:hidden">
            <PublicImageCloseButton />
          </div>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={imageWidth}
              height={imageHeight}
              unoptimized
              priority
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain shadow-sm"
            />
          ) : (
            <div className="grid aspect-square w-full max-w-md place-items-center rounded-xl bg-muted text-muted-foreground">
              Image unavailable
            </div>
          )}
        </section>

        <aside className="flex max-h-none flex-col overflow-y-auto bg-background p-6 md:p-8 lg:max-h-screen">
          <div className="mb-6 hidden justify-end lg:flex">
            <PublicImageCloseButton />
          </div>

          <div className="space-y-2 text-left">
            {publicImage.theme ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Hash className="size-3" />
                {publicImage.theme.title}
              </span>
            ) : null}
            <h1 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              {publicImage.title || copy.untitled}
            </h1>
          </div>

          {publicImage.creationNote ? (
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creation note</h2>
              <p className="mt-1.5 text-sm leading-6 text-foreground">{publicImage.creationNote}</p>
            </section>
          ) : null}

          <section className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.prompt}</div>
            <p className="mt-1.5 rounded-lg border border-border bg-muted/60 p-3 font-mono text-sm leading-6 text-foreground/90">
              {promptText}
            </p>
          </section>

          <div className="mt-6">
            <PublicImageDetailActions
              publicImageId={publicImage.publicImageId}
              promptText={promptText}
              copiedLabel={copy.copied}
              usePromptLabel={copy.usePrompt}
              saveLabel={copy.actions.save}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
