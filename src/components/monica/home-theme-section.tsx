import Image from 'next/image';
import Link from 'next/link';
import {
  themeBgColor,
  themeBorderColor,
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
  featuredImages?: Array<{ imageUrl?: string | null; thumbnailUrl?: string | null; title?: string | null } | null>;
  publishDate?: Date | string | null;
};

export function HomeThemeSection({ copy, themes = [] }: { copy: MonicaThemeCopy; themes?: HomeThemeItem[] }) {
  const featuredTheme = themes[0];
  const recentThemes = themes.slice(1, 3);

  return (
    <section className="monica-surface pb-20">
      <div className={cn(monicaContentWidthClass, 'grid gap-14 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center')}>
        <TodayTheme copy={copy} theme={featuredTheme} />
        <HeroImageStack theme={featuredTheme} themes={themes} />
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
    <div className="space-y-6">
      <div className={cn(
        'monica-chip',
        themeBgColor,
        themeBorderColor,
        themeIconColor,
      )}>
        {copy.eyebrow}
      </div>
      <h2 className="max-w-3xl text-[clamp(3.5rem,8vw,5.8rem)] font-[850] leading-[0.86] tracking-normal text-foreground">
        {title}
      </h2>
      <p className="monica-copy max-w-2xl">
        {description}
      </p>
      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        {copy.stats.slice(0, 2).map((item) => (
          <span key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1.5">
            {item}
          </span>
        ))}
      </div>
      <Link
        href={themeHref}
        className="monica-button-primary min-h-[52px] px-7"
      >
        {theme ? copy.homeCta : 'Browse themes'}
      </Link>
    </div>
  );
}

function getThemePreviewImages(theme?: HomeThemeItem, fallbackThemes: HomeThemeItem[] = []) {
  const featured = theme?.featuredImages
    ?.map((image) => image?.thumbnailUrl || image?.imageUrl)
    .filter((url): url is string => Boolean(url)) ?? [];
  const covers = [theme, ...fallbackThemes]
    .map((item) => item?.coverImageUrl)
    .filter((url): url is string => Boolean(url));

  return [...featured, ...covers].slice(0, 3);
}

function HeroImageStack({ theme, themes }: { theme?: HomeThemeItem; themes: HomeThemeItem[] }) {
  const images = getThemePreviewImages(theme, themes);

  if (images.length === 0) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Featured theme images will appear here.
      </div>
    );
  }

  return (
    <div className="relative min-h-[420px]">
      {images.map((imageUrl, index) => (
        <Link
          key={`${imageUrl}-${index}`}
          href={getThemeHref(theme)}
      className={cn(
            'absolute left-1/2 top-1/2 block h-[360px] w-[280px] overflow-hidden rounded-lg border-[6px] border-white bg-muted shadow-2xl shadow-black/20 transition duration-500 hover:z-10 hover:scale-[1.03]',
            index === 0 && 'z-30 -translate-x-[68%] -translate-y-1/2 -rotate-6 hover:-translate-x-[82%] hover:-rotate-2',
            index === 1 && 'z-20 -translate-x-[24%] -translate-y-[38%] rotate-6 opacity-95 hover:-translate-x-[14%] hover:rotate-2',
            index === 2 && 'z-10 -translate-x-[48%] -translate-y-[64%] -rotate-2 opacity-80 hover:-translate-y-[72%] hover:rotate-0',
          )}
        >
          <Image
            src={imageUrl}
            alt={theme?.title ?? 'Theme preview'}
            width={510}
            height={660}
            className="size-full object-cover"
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
      <h3 className="monica-section-title mb-6">
        {copy.recentTitle}
      </h3>
      <div className="grid gap-6 md:grid-cols-2">
        {themes.map((theme) => (
          <article key={theme.title} className="overflow-hidden rounded-lg border border-border bg-card/80 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className="p-6">
              <div className={cn('text-xs font-medium', themeIconColor)}>
                {theme.publishDate ? new Date(theme.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Published'}
              </div>
              <h4 className="mt-3 text-3xl font-bold leading-tight text-foreground">
                {theme.title}
              </h4>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {theme.brief || theme.description || 'Explore this official Monica theme.'}
              </p>
            </div>
            <MiniGallery theme={theme} />
            <div className="px-6 pb-6">
              <Link href={getThemeHref(theme)} className="text-sm font-semibold text-foreground hover:underline">
                View gallery
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MiniGallery({ theme }: { theme: HomeThemeItem }) {
  const images = getThemePreviewImages(theme);
  if (images.length === 0) {
    return <div className="mx-5 mb-5 grid min-h-32 place-items-center rounded-md bg-muted text-xs text-muted-foreground">No featured images yet.</div>;
  }

  return (
    <div className="grid min-h-40 grid-cols-[1.1fr_1fr] grid-rows-2 gap-2 px-5 pb-5">
      {images.map((imageUrl, index) => (
        <div key={`${imageUrl}-${index}`} className={cn('overflow-hidden rounded-md bg-muted', index === 0 && 'row-span-2')}>
          <Image src={imageUrl} alt={theme.title} width={360} height={360} unoptimized className="size-full object-cover" />
        </div>
      ))}
    </div>
  );
}
