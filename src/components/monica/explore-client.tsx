'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Heart, ImagePlus, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import {
  themeButtonGradientClass,
  themeButtonGradientHoverClass,
  themeHeroEyesOnClass,
} from '@windrun-huaiin/base-ui/lib';
import type { MonicaExploreCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { FilterPills, ListShell, SearchInput, useMonicaPagedList } from './list-components';
import { slugifyThemeTitle } from './theme-routes';

type ThemeItem = {
  id?: string;
  title: string;
  brief?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  featuredImages?: Array<{ id: string; publicImageId?: string | null; title?: string | null; imageUrl?: string | null; thumbnailUrl?: string | null } | null>;
  slug?: string;
  tags?: string[];
  publishDate?: string | null;
};

type PublicImage = {
  publicImageId: string;
  title?: string | null;
  creationNote?: string | null;
  likeCount: number;
  saveCount: number;
  viewCount?: number;
  uniqueViewCount?: number;
  publishedAt?: string | null;
  image: {
    imageId: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
};

type ExploreFilters = {
  keyword: string;
  themeId?: string;
};

type ExploreTab = 'themes' | 'images';

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function ExploreClient({ copy }: { copy: MonicaExploreCopy }) {
  const [tab, setTab] = useState<ExploreTab>('themes');
  const [activeImage, setActiveImage] = useState<PublicImage | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const themes = useMonicaPagedList<ExploreFilters, ThemeItem>({
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

  const sortOptions = [
    { value: 'newest', label: copy.sort.newest },
    { value: 'most_liked', label: copy.sort.mostLiked },
    { value: 'featured', label: copy.sort.featured },
  ];
  const tabOptions: Array<{ value: ExploreTab; label: string }> = [
    { value: 'themes', label: copy.tabs.themes },
    { value: 'images', label: copy.tabs.images },
  ];

  async function toggleAction(publicImageId: string, action: 'like' | 'save') {
    setActionError(null);
    try {
      const response = await fetch(`/api/monica/public-images/${publicImageId}/${action}`, {
        method: 'POST',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response));
      images.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }

  async function copyPrompt() {
    const text = activeImage?.title || activeImage?.creationNote || '';
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="min-h-screen px-4 py-20 md:px-8 md:py-24">
      <div className={monicaContentWidthClass}>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className={cn('bg-clip-text text-3xl font-semibold text-transparent md:text-5xl', themeHeroEyesOnClass)}>
              {copy.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
          </div>
          <FilterPills value={tab} options={tabOptions} onChange={setTab} />
        </div>

        {actionError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

        {tab === 'themes' ? (
          <ListShell
            items={themes.items}
            loading={themes.loading}
            error={themes.error}
            empty={copy.emptyThemes}
            pagination={themes.pagination}
            onPageChange={themes.setPage}
            filters={(
              <SearchInput
                value={themes.filters.keyword}
                placeholder={copy.searchPlaceholder}
                onChange={(keyword) => themes.updateFilters({ keyword })}
              />
            )}
            renderItem={(theme) => <ThemeListItem key={theme.id ?? theme.title} theme={theme} copy={copy} />}
          />
        ) : (
          <ListShell
            items={images.items}
            loading={images.loading}
            error={images.error}
            empty={copy.empty}
            pagination={images.pagination}
            onPageChange={images.setPage}
            filters={(
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-end">
                <SearchInput
                  value={images.filters.keyword}
                  placeholder={copy.searchPlaceholder}
                  onChange={(keyword) => images.updateFilters({ keyword })}
                />
                <FilterPills value={images.sortBy ?? 'newest'} options={sortOptions} onChange={images.setSortBy} />
              </div>
            )}
            renderItem={(publicImage) => (
              <PublicImageRow
                key={publicImage.publicImageId}
                publicImage={publicImage}
                copy={copy}
                onOpen={() => setActiveImage(publicImage)}
                onLike={() => void toggleAction(publicImage.publicImageId, 'like')}
                onSave={() => void toggleAction(publicImage.publicImageId, 'save')}
              />
            )}
          />
        )}
      </div>

      {activeImage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold">{copy.imageDetail}</h2>
              <button type="button" onClick={() => setActiveImage(null)} className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted" aria-label={copy.close}>
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_360px]">
              {activeImage.image?.imageUrl ? (
                <Image src={activeImage.image.imageUrl} alt="" width={1024} height={1024} unoptimized className="aspect-square w-full rounded-md object-cover" />
              ) : (
                <div className="grid aspect-square place-items-center rounded-md bg-muted text-muted-foreground"><ImagePlus className="size-8" /></div>
              )}
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{copy.prompt}</div>
                  <p className="mt-2 text-sm leading-6">{activeImage.creationNote || activeImage.title || copy.untitled}</p>
                </div>
                <button type="button" onClick={() => void copyPrompt()} className="h-10 rounded-md border border-border px-3 text-sm hover:bg-muted">
                  {copied ? copy.copied : copy.copyPrompt}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ThemeListItem({ theme, copy }: { theme: ThemeItem; copy: MonicaExploreCopy }) {
  const href = `/themes/${theme.id ?? theme.slug ?? slugifyThemeTitle(theme.title)}`;
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-card p-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
      <div className="grid gap-2">
        <div className="h-[102px] overflow-hidden rounded-md bg-muted">
          {theme.coverImageUrl ? (
            <Image src={theme.coverImageUrl} alt="" width={720} height={408} unoptimized className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
          )}
        </div>
        <ThemeFeaturedStrip images={theme.featuredImages} />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">{theme.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{theme.brief || theme.description || copy.emptyThemes}</p>
        {theme.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {theme.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{tag}</span>)}
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 md:w-36 md:flex-col">
        <Link href={href} className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-border px-3 text-sm hover:bg-muted md:flex-none">
          {copy.viewTheme}
        </Link>
        <Link href="/" className={cn('inline-flex h-10 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium text-white md:flex-none', themeButtonGradientClass, themeButtonGradientHoverClass)}>
          {copy.createFromTheme}
        </Link>
      </div>
    </article>
  );
}

function ThemeFeaturedStrip({ images }: { images?: Array<{ imageUrl?: string | null; thumbnailUrl?: string | null; title?: string | null } | null> }) {
  const slots = Array.from({ length: 3 }, (_, index) => images?.[index] ?? null);
  return (
    <div className="grid grid-cols-3 gap-1">
      {slots.map((image, index) => {
        const imageUrl = image?.thumbnailUrl || image?.imageUrl;
        return (
          <div key={`${imageUrl ?? 'empty'}-${index}`} className="h-11 overflow-hidden rounded bg-muted">
            {imageUrl ? (
              <Image src={imageUrl} alt={image?.title ?? ''} width={96} height={96} unoptimized className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground/60">
                <ImagePlus className="size-4" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PublicImageRow({
  publicImage,
  copy,
  onOpen,
  onLike,
  onSave,
}: {
  publicImage: PublicImage;
  copy: MonicaExploreCopy;
  onOpen: () => void;
  onLike: () => void;
  onSave: () => void;
}) {
  return (
    <article className="grid gap-4 rounded-lg border border-border bg-card p-3 md:grid-cols-[150px_minmax(0,1fr)_auto]">
      <button type="button" onClick={onOpen} className="overflow-hidden rounded-md bg-muted text-left" aria-label={copy.openDetail}>
        {publicImage.image?.imageUrl ? (
          <Image src={publicImage.image.imageUrl} alt="" width={1024} height={1024} unoptimized className="aspect-square w-full object-cover" />
        ) : (
          <div className="grid aspect-square place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
        )}
      </button>
      <div className="min-w-0 space-y-2">
        <h2 className="line-clamp-2 text-base font-semibold">{publicImage.title || copy.untitled}</h2>
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{publicImage.creationNote || copy.prompt}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{publicImage.likeCount} likes</span>
          <span>{publicImage.saveCount} saves</span>
          {typeof publicImage.viewCount === 'number' ? <span>{publicImage.viewCount} views</span> : null}
        </div>
      </div>
      <div className="flex gap-2 md:w-28 md:flex-col">
        <button type="button" onClick={onLike} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border text-sm hover:bg-muted md:flex-none">
          <Heart className="size-4" />
          {publicImage.likeCount}
        </button>
        <button type="button" onClick={onSave} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-border text-sm hover:bg-muted md:flex-none">
          <Bookmark className="size-4" />
          {publicImage.saveCount}
        </button>
      </div>
    </article>
  );
}
