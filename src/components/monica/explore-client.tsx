'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Cpu, Hash, Heart, ImagePlus } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { MonicaExploreCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { FilterPills, useMonicaPagedList, type Pagination } from './list-components';
import { slugifyThemeTitle } from './theme-routes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ThemeItem = {
  id?: string;
  issueNumber?: number | null;
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
type ThemeFilter = 'all' | 'featured' | 'open';

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
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>('all');
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

        {actionError ? (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-100">
            {actionError}
          </div>
        ) : null}

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
                {visibleThemes.map((theme) => <ThemeDiscoveryCard key={theme.id ?? theme.title} theme={theme} copy={copy} />)}
              </div>
            )}
            <PaginationControls pagination={themes.pagination} onPageChange={themes.setPage} />
          </div>
        ) : (
          <div className="space-y-4">
            {images.error ? <ErrorNotice message={images.error} /> : null}
            {images.loading ? (
              <ImageGridSkeleton />
            ) : images.items.length === 0 ? (
              <EmptyNotice message={copy.empty} />
            ) : (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 *:mb-4">
                {images.items.map((publicImage) => (
                  <PublicImageCard
                    key={publicImage.publicImageId}
                    publicImage={publicImage}
                    copy={copy}
                    onOpen={() => setActiveImage(publicImage)}
                    onSave={() => void toggleAction(publicImage.publicImageId, 'save')}
                  />
                ))}
              </div>
            )}
            <PaginationControls pagination={images.pagination} onPageChange={images.setPage} />
          </div>
        )}
      </div>

      <Dialog open={activeImage !== null} onOpenChange={(open) => {
        if (!open) setActiveImage(null);
      }}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-6xl lg:max-w-312">
          {activeImage ? (
            <div className="grid max-h-[88vh] grid-cols-1 md:grid-cols-[1.72fr_1fr]">
              <div className="flex items-center justify-center bg-neutral-100/70 p-4 md:p-6">
                {activeImage.image?.imageUrl ? (
                  <Image src={activeImage.image.imageUrl} alt={activeImage.title ?? ''} width={1400} height={1400} unoptimized className="mx-auto max-h-[78vh] w-auto rounded-xl object-contain shadow-sm" />
                ) : (
                  <div className="grid aspect-square w-full max-w-md place-items-center rounded-xl bg-muted text-muted-foreground"><ImagePlus className="size-8" /></div>
                )}
              </div>

              <div className="flex max-h-[88vh] flex-col overflow-y-auto p-6 md:p-8">
                <DialogHeader className="space-y-2 text-left">
                  {activeImage.theme ? (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <Hash className="size-3" />
                      {activeImage.theme.title}
                    </span>
                  ) : null}
                  <DialogTitle className="text-2xl font-semibold leading-tight">{activeImage.title || copy.untitled}</DialogTitle>
                </DialogHeader>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {activeImage.model ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Cpu className="size-4 text-emerald-600" />
                      <span className="font-medium text-foreground">{activeImage.model}</span>
                    </span>
                  ) : null}
                  {activeImage.ratio ? (
                    <span className="font-medium text-foreground">{activeImage.ratio}</span>
                  ) : null}
                </div>

                {activeImage.creationNote ? (
                  <div className="mt-6">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creation note</div>
                    <p className="mt-1.5 text-sm leading-6">{activeImage.creationNote}</p>
                  </div>
                ) : null}

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.prompt}</div>
                    <button type="button" onClick={() => void copyPrompt()} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      {copied ? copy.copied : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-1.5 rounded-lg border border-border bg-muted/60 p-3 font-mono text-sm leading-6 text-foreground/90">{activeImage.promptUsed || activeImage.title || copy.untitled}</p>
                </div>

                <div className="mt-6 flex gap-2">
                  <button type="button" onClick={() => handleUseImagePrompt('prompt')} className="monica-button-primary flex-1">
                    {copy.usePrompt}
                  </button>
                  <button type="button" onClick={() => void toggleAction(activeImage.publicImageId, 'save')} className="grid size-11 shrink-0 place-items-center rounded-md border border-border hover:bg-muted" aria-label={copy.actions.save}>
                    <Heart className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function UnderlineFilterTabs<TValue extends string>({
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

function formatThemeDate(value?: string | null) {
  if (!value) return 'Theme';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function ThemeDiscoveryCard({ theme, copy }: { theme: ThemeItem; copy: MonicaExploreCopy }) {
  const href = `/themes/${theme.id ?? theme.slug ?? slugifyThemeTitle(theme.title)}`;
  const featuredCount = theme.featuredImages?.filter(Boolean).length ?? 0;
  return (
    <article className="group grid gap-6 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-center md:gap-8 md:p-6">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {theme.issueNumber ? <span className="text-emerald-600">Issue #{theme.issueNumber}</span> : null}
          {theme.issueNumber ? <span aria-hidden className="text-border">·</span> : null}
          <span>{formatThemeDate(theme.publishDate)}</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold leading-tight tracking-normal text-foreground">{theme.title}</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">{theme.brief || theme.description || copy.emptyThemes}</p>
        <div className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm">
          <span className="font-semibold text-foreground">{featuredCount}</span>
          <span className="text-muted-foreground">featured</span>
        </div>
        <Link href={href} className="mt-5 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted">
          {copy.viewTheme}
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <ThemeFeaturedPreview images={theme.featuredImages} />
    </article>
  );
}

function ThemeFeaturedPreview({ images }: { images?: Array<{ imageUrl?: string | null; thumbnailUrl?: string | null; title?: string | null } | null> }) {
  const slots = Array.from({ length: 3 }, (_, index) => images?.[index] ?? null);
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {slots.map((image, index) => {
        const imageUrl = image?.thumbnailUrl || image?.imageUrl;
        return (
          <div key={`${imageUrl ?? 'empty'}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {imageUrl ? (
              <Image src={imageUrl} alt={image?.title ?? ''} width={360} height={360} unoptimized className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
  onSave,
}: {
  publicImage: PublicImage;
  copy: MonicaExploreCopy;
  onOpen: () => void;
  onSave: () => void;
}) {
  const imageUrl = publicImage.image?.thumbnailUrl || publicImage.image?.imageUrl;
  return (
    <article className="group block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-md">
      <button type="button" onClick={onOpen} className="block w-full overflow-hidden bg-muted text-left" aria-label={copy.openDetail}>
        {imageUrl ? (
          <Image src={imageUrl} alt={publicImage.title ?? ''} width={1024} height={1280} unoptimized className="aspect-4/5 w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid aspect-4/5 place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
        )}
      </button>
      <div className="flex items-start justify-between gap-3 p-4">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" aria-label={copy.openDetail}>
          <h2 className="line-clamp-1 font-semibold leading-snug">{publicImage.title || copy.untitled}</h2>
          {publicImage.creationNote ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">{publicImage.creationNote}</p>
          ) : null}
        </button>
        <button type="button" onClick={onSave} className="mt-0.5 inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-emerald-600" aria-label={copy.actions.save}>
          <Heart className="size-4" />
        </button>
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
  return <div className="grid min-h-[230px] animate-pulse rounded-lg border border-neutral-200 bg-white" />;
}

function ImageGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-4/5 animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}
