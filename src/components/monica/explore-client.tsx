'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Copy, Heart, ImagePlus, Sparkles, Wand2, X } from 'lucide-react';
import type { MonicaExploreCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { FilterPills, SearchInput, useMonicaPagedList, type Pagination } from './list-components';
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
  promptUsed?: string | null;
  likeCount: number;
  saveCount: number;
  viewCount?: number;
  uniqueViewCount?: number;
  publishedAt?: string | null;
  model?: string | null;
  style?: string | null;
  ratio?: string | null;
  image: {
    imageId: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
  theme?: { id: string; title: string; brief?: string | null } | null;
  author?: { userName?: string | null; email?: string | null } | null;
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
    const text = activeImage?.promptUsed || activeImage?.creationNote || activeImage?.title || '';
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleUseImagePrompt(kind: 'prompt' | 'inspiration') {
    const sourcePrompt = activeImage?.promptUsed || activeImage?.creationNote || activeImage?.title || '';
    if (!sourcePrompt) return;
    const nextPrompt = kind === 'inspiration'
      ? `${sourcePrompt}, reimagined with a fresh composition, distinct visual metaphor, new lighting, and original details`
      : sourcePrompt;
    window.localStorage.setItem('monica:creator-prompt', nextPrompt);
    window.location.href = '/';
  }

  return (
    <section className="monica-surface min-h-screen py-20 md:py-24">
      <div className={monicaContentWidthClass}>
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="monica-page-title">
              {copy.title}
            </h1>
            <p className="monica-copy mt-4 max-w-3xl">{copy.description}</p>
          </div>
          <FilterPills value={tab} options={tabOptions} onChange={setTab} />
        </div>

        {actionError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

        {tab === 'themes' ? (
          <div className="space-y-4">
            <div className="monica-panel-soft p-4">
              <SearchInput
                value={themes.filters.keyword}
                placeholder={copy.searchPlaceholder}
                onChange={(keyword) => themes.updateFilters({ keyword })}
              />
            </div>
            {themes.error ? <ErrorNotice message={themes.error} /> : null}
            {themes.loading ? (
              <ThemeSkeleton />
            ) : themes.items.length === 0 ? (
              <EmptyNotice message={copy.emptyThemes} />
            ) : (
              <div className="grid gap-8">
                {themes.items.map((theme) => <ThemeDiscoveryCard key={theme.id ?? theme.title} theme={theme} copy={copy} />)}
              </div>
            )}
            <PaginationControls pagination={themes.pagination} onPageChange={themes.setPage} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="monica-panel-soft p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-center">
                <SearchInput
                  value={images.filters.keyword}
                  placeholder={copy.searchPlaceholder}
                  onChange={(keyword) => images.updateFilters({ keyword })}
                />
                <FilterPills value={images.sortBy ?? 'newest'} options={sortOptions} onChange={images.setSortBy} />
              </div>
            </div>
            {images.error ? <ErrorNotice message={images.error} /> : null}
            {images.loading ? (
              <ImageGridSkeleton />
            ) : images.items.length === 0 ? (
              <EmptyNotice message={copy.empty} />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {images.items.map((publicImage) => (
                  <PublicImageCard
                    key={publicImage.publicImageId}
                    publicImage={publicImage}
                    copy={copy}
                    onOpen={() => setActiveImage(publicImage)}
                    onLike={() => void toggleAction(publicImage.publicImageId, 'like')}
                    onSave={() => void toggleAction(publicImage.publicImageId, 'save')}
                  />
                ))}
              </div>
            )}
            <PaginationControls pagination={images.pagination} onPageChange={images.setPage} />
          </div>
        )}
      </div>

      {activeImage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-lg border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-2xl font-semibold">{copy.imageDetail}</h2>
              <button type="button" onClick={() => setActiveImage(null)} className="grid size-9 place-items-center rounded-md border border-border hover:bg-muted" aria-label={copy.close}>
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-7 p-5 md:grid-cols-[minmax(0,1fr)_380px]">
              {activeImage.image?.imageUrl ? (
                <Image src={activeImage.image.imageUrl} alt={activeImage.title ?? ''} width={1024} height={1024} unoptimized className="max-h-[70vh] w-full rounded-md object-contain" />
              ) : (
                <div className="grid aspect-square place-items-center rounded-md bg-muted text-muted-foreground"><ImagePlus className="size-8" /></div>
              )}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{activeImage.author?.userName || activeImage.author?.email || 'Creator'}</span>
                  {activeImage.theme ? <span>{activeImage.theme.title}</span> : null}
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">{copy.prompt}</div>
                  <p className="mt-2 text-base leading-7">{activeImage.promptUsed || activeImage.creationNote || activeImage.title || copy.untitled}</p>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">Creation note</div>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">{activeImage.creationNote || 'No creation note.'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[activeImage.model, activeImage.style, activeImage.ratio].filter(Boolean).map((item) => (
                    <span key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">{item}</span>
                  ))}
                </div>
                <div className="grid gap-2">
                  <button type="button" onClick={() => handleUseImagePrompt('inspiration')} className="monica-button-primary">
                    <Sparkles className="size-4" />{copy.useAsInspiration}
                  </button>
                  <button type="button" onClick={() => handleUseImagePrompt('prompt')} className="monica-button-secondary">
                    <Wand2 className="size-4" />{copy.usePrompt}
                  </button>
                  <button type="button" onClick={() => void copyPrompt()} className="monica-button-secondary">
                    <Copy className="size-4" />{copied ? copy.copied : copy.copyPrompt}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => void toggleAction(activeImage.publicImageId, 'like')} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm hover:bg-muted">
                      <Heart className="size-4" />{copy.actions.like}
                    </button>
                    <button type="button" onClick={() => void toggleAction(activeImage.publicImageId, 'save')} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm hover:bg-muted">
                      <Bookmark className="size-4" />{copy.actions.save}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ThemeDiscoveryCard({ theme, copy }: { theme: ThemeItem; copy: MonicaExploreCopy }) {
  const href = `/themes/${theme.id ?? theme.slug ?? slugifyThemeTitle(theme.title)}`;
  return (
    <article className="grid min-h-[320px] gap-8 rounded-lg border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] md:items-center md:p-8">
      <div className="min-w-0">
        <div className="mb-4 inline-flex rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
          {theme.publishDate ? new Date(theme.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Theme'}
        </div>
        <h2 className="max-w-3xl text-4xl font-bold leading-none text-foreground md:text-6xl">{theme.title}</h2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{theme.brief || theme.description || copy.emptyThemes}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{theme.featuredImages?.filter(Boolean).length ?? 0} featured</span>
        </div>
        <Link href={href} className="monica-button-primary mt-7">
          {copy.viewTheme}
        </Link>
      </div>
      <ThemeFeaturedPreview images={theme.featuredImages} />
    </article>
  );
}

function ThemeFeaturedPreview({ images }: { images?: Array<{ imageUrl?: string | null; thumbnailUrl?: string | null; title?: string | null } | null> }) {
  const slots = Array.from({ length: 3 }, (_, index) => images?.[index] ?? null);
  return (
    <div className="grid min-h-[220px] grid-cols-3 gap-2">
      {slots.map((image, index) => {
        const imageUrl = image?.thumbnailUrl || image?.imageUrl;
        return (
          <div key={`${imageUrl ?? 'empty'}-${index}`} className="min-h-[220px] overflow-hidden rounded-md bg-muted">
            {imageUrl ? (
              <Image src={imageUrl} alt={image?.title ?? ''} width={360} height={520} unoptimized className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-muted-foreground/60">
                <ImagePlus className="size-7" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PublicImageCard({
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
  const imageUrl = publicImage.image?.thumbnailUrl || publicImage.image?.imageUrl;
  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:-translate-y-2 hover:shadow-2xl">
      <button type="button" onClick={onOpen} className="block w-full overflow-hidden bg-muted text-left" aria-label={copy.openDetail}>
        {imageUrl ? (
          <Image src={imageUrl} alt={publicImage.title ?? ''} width={1024} height={1280} unoptimized className="aspect-4/5 w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid aspect-4/5 place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
        )}
      </button>
      <div className="space-y-3 p-4">
        <div>
          <h2 className="line-clamp-1 text-lg font-semibold">{publicImage.title || copy.untitled}</h2>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{publicImage.creationNote || publicImage.promptUsed || ''}</p>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{publicImage.theme?.title || publicImage.author?.userName || 'Community image'}</span>
          <div className="flex gap-1">
            <button type="button" onClick={onLike} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 hover:bg-muted">
          <Heart className="size-4" />
          {publicImage.likeCount}
            </button>
            <button type="button" onClick={onSave} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 hover:bg-muted">
          <Bookmark className="size-4" />
          {publicImage.saveCount}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyNotice({ message }: { message: string }) {
  return <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">{message}</div>;
}

function ErrorNotice({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-100">{message}</div>;
}

function PaginationControls({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>Page {pagination.page} of {pagination.totalPages}</span>
      <div className="flex gap-2">
        <button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="h-9 rounded-md border border-border px-3 disabled:opacity-50">Previous</button>
        <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="h-9 rounded-md border border-border px-3 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

function ThemeSkeleton() {
  return <div className="grid min-h-[300px] animate-pulse rounded-lg border border-border bg-card/60" />;
}

function ImageGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-4/5 animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}
