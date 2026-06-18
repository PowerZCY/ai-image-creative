import Image from 'next/image';
import Link from 'next/link';
import {
  themeBgColor,
  themeBorderColor,
  themeButtonGradientClass,
  themeButtonGradientHoverClass,
  themeHeroEyesOnClass,
  themeIconColor,
} from '@windrun-huaiin/base-ui/lib';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaThemeCopy } from './copy';
import { monicaContentWidthClass } from './layout';

type HomeThemeItem = {
  id?: string | number | bigint | null;
  title: string;
  brief?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  publishDate?: Date | string | null;
};

export function HomeThemeSection({ copy, themes = [] }: { copy: MonicaThemeCopy; themes?: HomeThemeItem[] }) {
  const featuredTheme = themes[0];
  const recentThemes = themes.slice(0, 2);

  return (
    <section className="px-4 pb-20 md:px-8">
      <div className={cn(monicaContentWidthClass, 'grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-center')}>
        <TodayTheme copy={copy} theme={featuredTheme} />
        <ThemeGallery themes={themes} />
      </div>
      <RecentThemes copy={copy} themes={recentThemes} />
    </section>
  );
}

function getThemeHref(theme?: HomeThemeItem) {
  if (!theme?.id) return '/themes';
  return `/themes/${theme.id.toString()}`;
}

function TodayTheme({ copy, theme }: { copy: MonicaThemeCopy; theme?: HomeThemeItem }) {
  const themeHref = getThemeHref(theme);
  const title = theme?.title ?? copy.homeTitle;
  const description = theme?.brief || theme?.description || copy.homeDescription;

  return (
    <div className="space-y-5">
      <div className={cn(
        'inline-flex rounded-full border px-3 py-1 text-sm',
        themeBgColor,
        themeBorderColor,
        themeIconColor,
      )}>
        {copy.eyebrow}
      </div>
      <h2 className={cn('bg-clip-text text-3xl font-semibold text-transparent md:text-5xl', themeHeroEyesOnClass)}>
        {title}
      </h2>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground">
        {description}
      </p>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {copy.stats.slice(0, 2).map((item) => (
          <span key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1">
            {item}
          </span>
        ))}
      </div>
      <Link
        href={themeHref}
        className={cn(
          'inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105',
          themeButtonGradientClass,
          themeButtonGradientHoverClass,
        )}
      >
        {theme ? copy.homeCta : 'Browse themes'}
      </Link>
    </div>
  );
}

function ThemeGallery({ themes }: { themes: HomeThemeItem[] }) {
  const images = themes
    .filter((theme) => theme.coverImageUrl)
    .slice(0, 3);

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        No published theme covers yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map((theme, index) => (
        <Link key={theme.id?.toString() ?? theme.title} href={getThemeHref(theme)} className={index === 0 ? 'col-span-2 row-span-2' : ''}>
          <Image
            src={theme.coverImageUrl!}
            alt={theme.title}
            width={index === 0 ? 720 : 360}
            height={index === 0 ? 720 : 360}
            className="aspect-square w-full rounded-lg object-cover transition hover:brightness-105"
            priority={index === 0}
          />
        </Link>
      ))}
    </div>
  );
}

function RecentThemes({ copy, themes }: { copy: MonicaThemeCopy; themes: HomeThemeItem[] }) {
  if (themes.length === 0) return null;

  return (
    <div className={cn(monicaContentWidthClass, 'mt-16')}>
      <h3 className="mb-5 text-xl font-semibold text-foreground">
        {copy.recentTitle}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => (
          <article key={theme.title} className="rounded-lg border border-border bg-card/70 p-5">
            <div className={cn('text-xs font-medium', themeIconColor)}>
              {theme.publishDate ? new Date(theme.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Published'}
            </div>
            <h4 className="mt-3 text-lg font-semibold text-foreground">
              {theme.title}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {theme.brief || theme.description || 'Explore this official Monica theme.'}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
