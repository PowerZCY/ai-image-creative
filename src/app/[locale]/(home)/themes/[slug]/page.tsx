import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { monicaContentWidthClass } from '@/components/monica/layout';
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
  const [creatorCopy, themeCopy] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
  ]);
  const dbTheme = await themeService.findPublicThemeBySlug(slug);

  if (!dbTheme) {
    notFound();
  }

  const title = dbTheme.title;
  const description = dbTheme.description ?? dbTheme.brief ?? themeCopy.homeDescription;
  const coverImageUrl = dbTheme.coverImageUrl;
  const tags = dbTheme.tags as string[];
  const promptTexts = dbTheme.promptTexts ?? [];

  return (
    <>
      <section className="px-4 pb-10 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className={cn('mx-auto inline-flex rounded-full border px-3 py-1 text-sm', themeBgColor, themeBorderColor, themeIconColor)}>
            {dbTheme.publishDate ? new Date(dbTheme.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Published theme'}
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
              alt={title}
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

      <MonicaCreator copy={creatorCopy} themeId={dbTheme.id} />

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
          <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
            Public gallery images will appear here after submissions are approved for this theme.
          </div>
        </div>
      </section>
    </>
  );
}
