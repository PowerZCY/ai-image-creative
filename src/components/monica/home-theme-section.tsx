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

export function HomeThemeSection({ copy }: { copy: MonicaThemeCopy }) {
  return (
    <section className="px-4 pb-20 md:px-8">
      <div className={cn(monicaContentWidthClass, 'grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-center')}>
        <TodayTheme copy={copy} />
        <ThemeGallery copy={copy} />
      </div>
      <RecentThemes copy={copy} />
    </section>
  );
}

function TodayTheme({ copy }: { copy: MonicaThemeCopy }) {
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
        {copy.homeTitle}
      </h2>
      <p className="max-w-2xl text-base leading-7 text-muted-foreground">
        {copy.homeDescription}
      </p>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {copy.stats.slice(0, 2).map((item) => (
          <span key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1">
            {item}
          </span>
        ))}
      </div>
      <Link
        href="/theme"
        className={cn(
          'inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-105',
          themeButtonGradientClass,
          themeButtonGradientHoverClass,
        )}
      >
        {copy.homeCta}
      </Link>
    </div>
  );
}

function ThemeGallery({ copy }: { copy: MonicaThemeCopy }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {copy.gallery.slice(0, 3).map((image, index) => (
        <div key={image.title} className={index === 0 ? 'col-span-2 row-span-2' : ''}>
          <Image
            src={image.imageUrl}
            alt={image.alt}
            width={index === 0 ? 720 : 360}
            height={index === 0 ? 720 : 360}
            className="aspect-square w-full rounded-lg object-cover"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
}

function RecentThemes({ copy }: { copy: MonicaThemeCopy }) {
  return (
    <div className={cn(monicaContentWidthClass, 'mt-16')}>
      <h3 className="mb-5 text-xl font-semibold text-foreground">
        {copy.recentTitle}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        {copy.recent.map((theme) => (
          <article key={theme.title} className="rounded-lg border border-border bg-card/70 p-5">
            <div className={cn('text-xs font-medium', themeIconColor)}>
              {theme.label}
            </div>
            <h4 className="mt-3 text-lg font-semibold text-foreground">
              {theme.title}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {theme.brief}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
