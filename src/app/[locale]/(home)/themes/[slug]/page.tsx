import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaExploreCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { monicaContentWidthClass } from '@/components/monica/layout';
import { getTodayThemeSlug, slugifyThemeTitle } from '@/components/monica/theme-routes';
import { themeService } from '@/server/monica/services/theme.service';
import {
  themeBgColor,
  themeBorderColor,
  themeButtonGradientClass,
  themeHeroEyesOnClass,
  themeIconColor,
} from '@windrun-huaiin/base-ui/lib';
import { cn } from '@windrun-huaiin/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [creatorCopy, themeCopy, exploreCopy] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
    getMonicaExploreCopy(locale),
  ]);
  const dbTheme = await themeService.findPublicThemeBySlug(slug);
  const todaySlug = getTodayThemeSlug(themeCopy);
  const summary = exploreCopy.themes.find((theme) => slugifyThemeTitle(theme.title) === slug);

  if (!dbTheme && !summary && slug !== todaySlug) {
    notFound();
  }

  const isToday = !dbTheme && slug === todaySlug;
  const title = dbTheme?.title ?? (isToday ? themeCopy.title : summary?.title ?? themeCopy.title);
  const description = dbTheme?.description ?? dbTheme?.brief ?? (isToday ? themeCopy.homeDescription : summary?.brief ?? themeCopy.homeDescription);
  const coverImage = isToday ? themeCopy.gallery[0] : undefined;
  const coverImageUrl = dbTheme?.coverImageUrl ?? coverImage?.imageUrl;
  const tags = dbTheme ? dbTheme.tags as string[] : isToday ? themeCopy.tags : summary?.tags ?? [];
  const promptTexts = dbTheme?.promptTexts ?? [];

  return (
    <>
      <section className="px-4 pb-10 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className={cn('mx-auto inline-flex rounded-full border px-3 py-1 text-sm', themeBgColor, themeBorderColor, themeIconColor)}>
            {isToday ? themeCopy.date : summary?.date}
          </div>
          <h1 className={cn('mt-5 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl', themeHeroEyesOnClass)}>
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className={cn('rounded-full border px-3 py-1 text-xs', themeBgColor, themeBorderColor, themeIconColor)}>
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5">
            <Link href="/themes" className="text-sm font-medium text-foreground underline underline-offset-4">
              Back to themes
            </Link>
          </div>
        </div>
      </section>

      {coverImageUrl ? (
        <section className="px-4 pb-8 md:px-8">
          <div className={cn(monicaContentWidthClass, 'overflow-hidden rounded-lg border border-border bg-card')}>
            <Image
              src={coverImageUrl}
              alt={coverImage?.alt ?? title}
              width={1200}
              height={720}
              className="max-h-[520px] w-full object-cover"
              priority
            />
          </div>
        </section>
      ) : null}

      {promptTexts.length > 0 ? (
        <section className="px-4 pb-8 md:px-8">
          <div className={cn(monicaContentWidthClass, 'grid gap-3 md:grid-cols-2')}>
            {promptTexts.map((prompt) => (
              <p key={prompt} className="rounded-lg border border-border bg-card/60 p-4 text-sm leading-6 text-muted-foreground">
                {prompt}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {isToday ? (
        <section className="px-4 pb-8 md:px-8">
          <div className={cn(monicaContentWidthClass, 'grid gap-3 md:grid-cols-2')}>
            {themeCopy.notes.map((note) => (
              <p key={note} className="rounded-lg border border-border bg-card/60 p-4 text-sm leading-6 text-muted-foreground">
                {note}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <MonicaCreator copy={creatorCopy} />

      <section className="px-4 pb-24 md:px-8">
        <div className={monicaContentWidthClass}>
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <h2 className="text-2xl font-semibold text-foreground">{themeCopy.galleryTitle}</h2>
            <div className="flex rounded-md border border-border bg-muted/50 p-1">
              {Object.values(themeCopy.galleryTabs).map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    'h-9 rounded px-3 text-sm transition',
                    index === 0 ? cn('text-white', themeButtonGradientClass) : 'text-muted-foreground hover:bg-background hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(isToday ? themeCopy.gallery : []).map((image) => (
              <article key={image.title} className="overflow-hidden rounded-lg border border-border bg-card">
                <Image src={image.imageUrl} alt={image.alt} width={720} height={720} className="aspect-square w-full object-cover" />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{image.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{image.author}</p>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{image.prompt}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
