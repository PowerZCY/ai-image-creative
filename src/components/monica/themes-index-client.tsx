'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaThemesCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { FilterPills } from './list-components';
import { EmptyNotice, ErrorNotice } from './public-image-gallery';
import { ThemeDiscoveryCard, type SharedThemeItem } from './theme-discovery-card';

type ThemeCursor = { publishDate: string; id: string };
type ThemeFilter = 'all' | 'featured' | 'open';

type ThemesIndexClientProps = {
  copy: MonicaThemesCopy;
  initialItems: SharedThemeItem[];
  initialNextCursor: ThemeCursor | null;
  initialHasMore: boolean;
};

export function ThemesIndexClient({ copy, initialItems, initialNextCursor, initialHasMore }: ThemesIndexClientProps) {
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>('all');
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<ThemeCursor | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilter, setLoadingFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const loadingFilterRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const themeFilterOptions: Array<{ value: ThemeFilter; label: string }> = [
    { value: 'all', label: 'All themes' },
    { value: 'featured', label: 'With featured picks' },
    { value: 'open', label: 'No featured yet' },
  ];
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || loadingFilterRef.current || !hasMore || !nextCursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/themes/more', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ cursor: nextCursor, pageSize: 20, filter: themeFilter }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = await response.json() as {
        items?: SharedThemeItem[];
        nextCursor?: ThemeCursor | null;
        hasMore?: boolean;
      };
      setItems((current) => [...current, ...(data.items ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, nextCursor, themeFilter]);

  const changeFilter = useCallback(async (filter: ThemeFilter) => {
    if (loadingFilterRef.current || filter === themeFilter) return;
    loadingFilterRef.current = true;
    setLoadingFilter(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/themes/more', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ pageSize: 20, filter }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const data = await response.json() as {
        items?: SharedThemeItem[];
        nextCursor?: ThemeCursor | null;
        hasMore?: boolean;
      };
      setThemeFilter(filter);
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      loadingFilterRef.current = false;
      setLoadingFilter(false);
    }
  }, [themeFilter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void loadMore();
    }, { rootMargin: '400px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <section className="monica-surface min-h-screen py-12 md:py-16">
      <div className={monicaContentWidthClass}>
        <div className="mb-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl">{copy.title}</h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">{copy.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <FilterPills value={themeFilter} options={themeFilterOptions} onChange={(filter) => void changeFilter(filter)} />
          {loadingFilter ? (
            <ThemeSkeleton />
          ) : items.length === 0 ? (
            <EmptyNotice message={copy.emptyThemes} />
          ) : (
            <div className="grid gap-5">
              {items.map((theme) => (
                <ThemeDiscoveryCard
                  key={theme.id ?? theme.title}
                  theme={theme}
                  emptyDescriptionFallback={copy.emptyThemes}
                  viewThemeText={copy.viewTheme}
                />
              ))}
            </div>
          )}
          {error ? <ErrorNotice message={error} /> : null}
          {hasMore && !loadingFilter ? (
            <div ref={sentinelRef} className="flex min-h-12 justify-center pt-2">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {loadingMore ? copy.loading : error ? copy.retry : copy.loadMore}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ThemeSkeleton() {
  return <div className="grid min-h-[230px] animate-pulse rounded-lg border border-border bg-muted/50" />;
}

async function readApiError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
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
