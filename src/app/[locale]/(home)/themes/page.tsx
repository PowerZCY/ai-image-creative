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
import { getMonicaExploreCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { monicaContentWidthClass } from '@/components/monica/layout';
import { themeService } from '@/server/monica/services/theme.service';

export const dynamic = 'force-dynamic';

export default async function ThemesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [themeCopy, exploreCopy] = await Promise.all([
    getMonicaThemeCopy(locale),
    getMonicaExploreCopy(locale),
  ]);
  const publicThemes = await themeService.listPublicThemes();
  const themeCards = publicThemes.map((theme) => ({
    title: theme.title,
    date: theme.publishDate ? new Date(theme.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Published',
    brief: theme.brief || theme.description || 'Explore this official Monica theme.',
    stats: typeof theme.stats === 'object' && theme.stats && 'creations' in theme.stats
      ? String(theme.stats.creations)
      : `${theme.promptTexts.length} prompts`,
    tags: theme.tags as string[],
    coverImageUrl: theme.coverImageUrl || undefined,
    slug: theme.id?.toString() ?? theme.slug,
  }));
  const featuredTheme = themeCards[0];

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className={monicaContentWidthClass}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.65fr)] lg:items-start">
          <div>
            <div className={cn('inline-flex rounded-full border px-3 py-1 text-sm', themeBgColor, themeBorderColor, themeIconColor)}>
              {themeCopy.eyebrow}
            </div>
            <h1 className={cn('mt-5 max-w-3xl bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl', themeHeroEyesOnClass)}>
              Themes
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Browse published themes, use their prompt ideas, and submit your own theme ideas for review.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {featuredTheme ? (
                <Link
                  href={`/themes/${featuredTheme.slug}`}
                  className={cn('inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold text-white hover:brightness-105', themeButtonGradientClass, themeButtonGradientHoverClass)}
                >
                  View latest theme
                </Link>
              ) : null}
              <Link
                href="/themes/my"
                className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                My theme ideas
              </Link>
            </div>
          </div>

          {featuredTheme ? (
            <Link href={`/themes/${featuredTheme.slug}`} className="group overflow-hidden rounded-lg border border-border bg-card">
              {featuredTheme.coverImageUrl ? (
              <Image
                src={featuredTheme.coverImageUrl}
                alt=""
                width={720}
                height={520}
                className="aspect-16/10 w-full object-cover transition group-hover:scale-[1.02]"
                priority
                />
              ) : null}
              <div className="space-y-3 p-4">
                <div className={cn('text-xs font-medium', themeIconColor)}>{featuredTheme.date}</div>
                <h2 className="text-xl font-semibold text-foreground">{featuredTheme.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{featuredTheme.brief}</p>
              </div>
            </Link>
          ) : (
            <div className="grid min-h-64 place-items-center rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No published themes yet.
            </div>
          )}
        </div>

        {themeCards.length > 0 ? (
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themeCards.map((theme) => (
            <article key={theme.title} className="overflow-hidden rounded-lg border border-border bg-card">
              {theme.coverImageUrl ? (
                <Image
                  src={theme.coverImageUrl}
                  alt=""
                  width={720}
                  height={480}
                  className="aspect-16/10 w-full object-cover"
                />
              ) : (
                <div className="grid aspect-16/10 place-items-center bg-muted text-sm text-muted-foreground">
                  {theme.title}
                </div>
              )}
              <div className="space-y-4 p-4">
                <div className={cn('text-xs font-medium', themeIconColor)}>{theme.date}</div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{theme.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{theme.brief}</p>
                </div>
                <div className="text-xs text-muted-foreground">{theme.stats}</div>
                <div className="flex flex-wrap gap-2">
                  {theme.tags.map((tag) => (
                    <span key={tag} className={cn('rounded-full border px-2 py-1 text-xs', themeBgColor, themeBorderColor, themeIconColor)}>
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/themes/${theme.slug}`}
                  className="flex h-10 items-center justify-center rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted"
                >
                  {exploreCopy.viewTheme}
                </Link>
              </div>
            </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
