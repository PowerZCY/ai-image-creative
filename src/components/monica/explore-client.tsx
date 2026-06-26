'use client';

import { useState } from 'react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaExploreCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { FilterPills, useMonicaPagedList } from './list-components';
import { EmptyNotice, ErrorNotice, PaginationControls, PublicImageGallery, type PublicImage } from './public-image-gallery';
import { ThemeDiscoveryCard, type SharedThemeItem } from './theme-discovery-card';

type ExploreFilters = {
  keyword: string;
  themeId?: string;
};

type ExploreTab = 'themes' | 'images';
type ThemeFilter = 'all' | 'featured' | 'open';

export function ExploreClient({ copy }: { copy: MonicaExploreCopy }) {
  const [tab, setTab] = useState<ExploreTab>('themes');
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>('all');
  const themes = useMonicaPagedList<ExploreFilters, SharedThemeItem>({
    endpoint: '/api/monica/themes/search',
    initialFilters: { keyword: '' },
    pageSize: 12,
  });
  const images = useMonicaPagedList<ExploreFilters, PublicImage>({
    endpoint: '/api/monica/explore/images/search',
    initialFilters: { keyword: '' },
    initialSortBy: 'newest',
    pageSize: 12,
  });

  const tabOptions: Array<{ value: ExploreTab; label: string }> = [
    { value: 'themes', label: copy.tabs.themes },
    { value: 'images', label: copy.tabs.images },
  ];
  const themeFilterOptions: Array<{ value: ThemeFilter; label: string }> = [
    { value: 'all', label: 'All themes' },
    { value: 'featured', label: 'With featured picks' },
    { value: 'open', label: 'No featured yet' },
  ];
  const visibleThemes = themes.items.filter((theme) => {
    const featuredCount = theme.featuredImages?.filter(Boolean).length ?? 0;
    if (themeFilter === 'featured') return featuredCount > 0;
    if (themeFilter === 'open') return featuredCount === 0;
    return true;
  });

  return (
    <section className="monica-surface min-h-screen py-12 md:py-16">
      <div className={monicaContentWidthClass}>
        <div className="mb-8">
          <div className="max-w-3xl">
            <p className="text-lg leading-8 text-muted-foreground lg:whitespace-nowrap">{copy.description}</p>
          </div>
          <div className="mt-8 flex justify-start">
            <FilterPills value={tab} options={tabOptions} onChange={setTab} />
          </div>
        </div>

        {tab === 'themes' ? (
          <div className="space-y-4">
            <UnderlineFilterTabs value={themeFilter} options={themeFilterOptions} onChange={setThemeFilter} />
            {themes.error ? <ErrorNotice message={themes.error} /> : null}
            {themes.loading ? (
              <ThemeSkeleton />
            ) : visibleThemes.length === 0 ? (
              <EmptyNotice message={copy.emptyThemes} />
            ) : (
              <div className="grid gap-5">
                {visibleThemes.map((theme) => (
                  <ThemeDiscoveryCard 
                    key={theme.id ?? theme.title} 
                    theme={theme} 
                    emptyDescriptionFallback={copy.emptyThemes}
                    viewThemeText={copy.viewTheme}
                  />
                ))}
              </div>
            )}
            <PaginationControls pagination={themes.pagination} onPageChange={themes.setPage} />
          </div>
        ) : (
          <PublicImageGallery
            items={images.items}
            loading={images.loading}
            error={images.error}
            pagination={images.pagination}
            onPageChange={images.setPage}
            onReload={images.reload}
            copy={copy}
          />
        )}
      </div>
    </section>
  );
}

export function UnderlineFilterTabs<TValue extends string>({
  value,
  options,
  onChange,
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-center gap-6">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={cn(
              'whitespace-nowrap border-b-2 border-transparent px-0 pb-1 text-lg font-medium leading-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              value === option.value && 'border-black text-black',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}


function ThemeSkeleton() {
  return <div className="grid min-h-[230px] animate-pulse rounded-lg border border-neutral-200 bg-white" />;
}
