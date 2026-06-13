'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Heart, ImagePlus, Loader2, Search, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaExploreCopy, MonicaThemeSummary } from './copy';

type PublicImage = {
  publicImageId: string;
  title?: string | null;
  likeCount: number;
  saveCount: number;
  publishedAt?: string | null;
  image: {
    imageId: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    promptUsed?: string | null;
  };
};

type ExploreTab = 'themes' | 'images';
type ThemeFilter = 'latest' | 'popular' | 'cinematic' | 'surreal';

async function readError(response: Response) {
  try {
    const data = await response.json();
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function ExploreClient({ copy }: { copy: MonicaExploreCopy }) {
  const sortOptions = [
    { value: 'newest', label: copy.sort.newest },
    { value: 'most_liked', label: copy.sort.mostLiked },
    { value: 'featured', label: copy.sort.featured },
  ];
  const filterOptions: Array<{ value: ThemeFilter; label: string }> = [
    { value: 'latest', label: copy.filters.latest },
    { value: 'popular', label: copy.filters.popular },
    { value: 'cinematic', label: copy.filters.cinematic },
    { value: 'surreal', label: copy.filters.surreal },
  ];

  const [tab, setTab] = useState<ExploreTab>('themes');
  const [query, setQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>('latest');
  const [sort, setSort] = useState('newest');
  const [images, setImages] = useState<PublicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<PublicImage | null>(null);
  const [copied, setCopied] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredThemes = copy.themes.filter((theme) => {
    const haystack = [theme.title, theme.brief, theme.stats, ...theme.tags].join(' ').toLowerCase();
    const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
    const matchesFilter =
      themeFilter === 'latest'
      || (themeFilter === 'popular' && theme.stats.toLowerCase().includes('creations'))
      || theme.tags.some((tag) => tag.toLowerCase().includes(themeFilter));
    return matchesQuery && matchesFilter;
  });

  async function fetchImages(nextSort: string) {
    const response = await fetch(`/api/monica/explore/images?sort=${encodeURIComponent(nextSort)}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(await readError(response));
    }
    const data = await response.json() as { images: PublicImage[] };
    return data.images;
  }

  async function loadImages(nextSort = sort) {
    setLoading(true);
    setError(null);
    try {
      setImages(await fetchImages(nextSort));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadSortedImages() {
      try {
        const nextImages = await fetchImages(sort);
        if (active) {
          setImages(nextImages);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSortedImages();

    return () => {
      active = false;
    };
  }, [sort]);

  async function toggleAction(publicImageId: string, action: 'like' | 'save') {
    try {
      const response = await fetch(`/api/monica/public-images/${publicImageId}/${action}`, {
        method: 'POST',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      await loadImages(sort);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    }
  }

  async function copyActivePrompt() {
    const prompt = activeImage?.image.promptUsed;
    if (!prompt) return;
    await navigator.clipboard?.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold text-white md:text-5xl">{copy.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {copy.description}
            </p>
          </div>
          <div className="flex rounded-md border border-white/10 bg-zinc-950 p-1">
            {([
              { value: 'themes', label: copy.tabs.themes },
              { value: 'images', label: copy.tabs.images },
            ] as Array<{ value: ExploreTab; label: string }>).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTab(option.value)}
                className={cn(
                  'h-9 rounded px-3 text-sm transition',
                  tab === option.value ? 'bg-emerald-300 text-zinc-950' : 'text-zinc-300 hover:bg-white/10',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-white/10 bg-zinc-950/70 p-3 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-10 w-full rounded-md border border-white/10 bg-zinc-900 pl-9 pr-3 text-sm text-white outline-none transition focus:border-emerald-300/70"
            />
          </label>

          {tab === 'themes' ? (
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setThemeFilter(option.value)}
                  className={cn(
                    'h-9 rounded-md border px-3 text-sm transition',
                    themeFilter === option.value
                      ? 'border-emerald-300 bg-emerald-300 text-zinc-950'
                      : 'border-white/10 text-zinc-300 hover:bg-white/10',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex rounded-md border border-white/10 bg-zinc-950 p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={cn(
                    'h-9 rounded px-3 text-sm transition',
                    sort === option.value ? 'bg-emerald-300 text-zinc-950' : 'text-zinc-300 hover:bg-white/10',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {error}
          </div>
        )}

        {tab === 'themes' ? (
          filteredThemes.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-6 text-sm text-zinc-400">
              {copy.emptyThemes}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredThemes.map((theme) => (
                <ThemeCard key={theme.title} theme={theme} copy={copy} />
              ))}
            </div>
          )
        ) : loading ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/60 text-zinc-400">
              <Loader2 className="mr-2 size-4 animate-spin" />
              {copy.loading}
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-6 text-sm text-zinc-400">
              {copy.empty}
            </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((publicImage) => (
              <article key={publicImage.publicImageId} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                <button
                  type="button"
                  onClick={() => setActiveImage(publicImage)}
                  className="block w-full text-left"
                  aria-label={copy.openDetail}
                >
                  {publicImage.image.imageUrl ? (
                    <Image
                      src={publicImage.image.imageUrl}
                      alt=""
                      width={1024}
                      height={1024}
                      unoptimized
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center text-zinc-500">
                      <ImagePlus className="size-8" />
                    </div>
                  )}
                </button>
                <div className="space-y-3 p-3">
                  <div className="truncate text-sm font-medium text-white">
                    {publicImage.title || publicImage.image.promptUsed || copy.untitled}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleAction(publicImage.publicImageId, 'like')}
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      <Heart className="size-4" />
                      <span className="sr-only">{copy.actions.like}</span>
                      <span>{publicImage.likeCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleAction(publicImage.publicImageId, 'save')}
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 text-sm text-zinc-200 hover:bg-white/10"
                    >
                      <Bookmark className="size-4" />
                      <span className="sr-only">{copy.actions.save}</span>
                      <span>{publicImage.saveCount}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {activeImage && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="text-lg font-semibold text-white">{copy.imageDetail}</h2>
              <button
                type="button"
                onClick={() => setActiveImage(null)}
                className="grid size-9 place-items-center rounded-md border border-white/10 text-zinc-300 hover:bg-white/10"
                aria-label={copy.close}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_360px]">
              {activeImage.image.imageUrl ? (
                <Image
                  src={activeImage.image.imageUrl}
                  alt=""
                  width={1024}
                  height={1024}
                  unoptimized
                  className="aspect-square w-full rounded-md object-cover"
                />
              ) : (
                <div className="grid aspect-square place-items-center rounded-md bg-zinc-900 text-zinc-500">
                  <ImagePlus className="size-8" />
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase text-zinc-500">{copy.prompt}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">
                    {activeImage.image.promptUsed || activeImage.title || copy.untitled}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void copyActivePrompt()}
                    className="h-10 rounded-md border border-white/10 px-3 text-sm text-zinc-200 hover:bg-white/10"
                  >
                    {copied ? copy.copied : copy.copyPrompt}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImage(null)}
                    className="h-10 rounded-md bg-emerald-300 px-3 text-sm font-medium text-zinc-950 hover:bg-emerald-200"
                  >
                    {copy.usePrompt}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ThemeCard({ theme, copy }: { theme: MonicaThemeSummary; copy: MonicaExploreCopy }) {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
      {theme.coverImageUrl ? (
        <Image
          src={theme.coverImageUrl}
          alt=""
          width={720}
          height={480}
          className="aspect-[16/10] w-full object-cover"
        />
      ) : (
        <div className="grid aspect-[16/10] place-items-center bg-zinc-900 text-zinc-500">
          <ImagePlus className="size-8" />
        </div>
      )}
      <div className="space-y-4 p-4">
        <div className="text-xs text-emerald-100">{theme.date}</div>
        <div>
          <h2 className="text-lg font-semibold text-white">{theme.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{theme.brief}</p>
        </div>
        <div className="text-xs text-zinc-500">{theme.stats}</div>
        <div className="flex flex-wrap gap-2">
          {theme.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-300">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Link
            href="/theme"
            className="flex h-9 flex-1 items-center justify-center rounded-md border border-white/10 text-sm text-zinc-200 hover:bg-white/10"
          >
            {copy.viewTheme}
          </Link>
          <Link
            href="/"
            className="flex h-9 flex-1 items-center justify-center rounded-md bg-emerald-300 px-3 text-sm font-medium text-zinc-950 hover:bg-emerald-200"
          >
            {copy.createFromTheme}
          </Link>
        </div>
      </div>
    </article>
  );
}
