import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { MonicaThemeCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { ThemeDiscoveryCard, type SharedThemeItem } from './theme-discovery-card';

export function HomeThemeSection({ copy, themes = [] }: { copy: MonicaThemeCopy; themes?: SharedThemeItem[] }) {
  const featuredTheme = themes[0];
  const recentThemes = themes.slice(1, 3); // Display exactly 2 recent themes

  return (
    <section className="monica-surface py-12 md:py-20">
      <div className={monicaContentWidthClass}>
        
        {/* Block 1: Today's Theme */}
        {featuredTheme ? (
          <div className="mb-10 md:mb-14">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {copy.eyebrow}
              </h3>
            </div>
            <ThemeDiscoveryCard 
              theme={featuredTheme}
              emptyDescriptionFallback={copy.homeDescription}
              viewThemeText={copy.homeCta}
              hideMeta
            />
          </div>
        ) : null}

        {/* Block 2: Recent Challenges */}
        {recentThemes.length > 0 ? (
          <div>
            {/* Refined Variant A: Elegant Section Header with CTA Link */}
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                {copy.recentTitle}
              </h3>
              <Link href="/explore" className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                View all in Explore
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="grid gap-6 md:gap-8">
              {recentThemes.map((theme) => (
                <ThemeDiscoveryCard 
                  key={theme.id ?? theme.title} 
                  theme={theme} 
                  emptyDescriptionFallback="Explore this official Monica theme." 
                />
              ))}
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}
