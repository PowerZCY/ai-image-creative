'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Copy, Cpu, Hash, Heart, ImagePlus } from 'lucide-react';
import type { Pagination } from './list-components';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type PublicImage = {
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
    imageId?: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
  theme?: { id: string; title: string; brief?: string | null } | null;
  author?: { userName?: string | null; email?: string | null } | null;
};

export type PublicImageGalleryCopy = {
  empty: string;
  untitled: string;
  openDetail: string;
  prompt: string;
  usePrompt: string;
  copied: string;
  actions: {
    save: string;
  };
};

async function readError(response: Response) {
  try {
    const data = await response.json() as { error?: unknown };
    return typeof data.error === 'string' ? data.error : response.statusText;
  } catch {
    return response.statusText;
  }
}

export function PublicImageGallery({
  items,
  loading,
  error,
  pagination,
  onPageChange,
  onReload,
  copy,
}: {
  items: PublicImage[];
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onReload: () => void;
  copy: PublicImageGalleryCopy;
}) {
  const [activeImage, setActiveImage] = useState<PublicImage | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleSave(publicImageId: string) {
    setActionError(null);
    try {
      const response = await fetch(`/api/monica/public-images/${publicImageId}/save`, {
        method: 'POST',
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(await readError(response));
      onReload();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : String(saveError));
    }
  }

  async function copyPrompt() {
    const text = activeImage?.promptUsed || activeImage?.creationNote || activeImage?.title || '';
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleUseImagePrompt() {
    const sourcePrompt = activeImage?.promptUsed || activeImage?.creationNote || activeImage?.title || '';
    if (!sourcePrompt) return;
    window.localStorage.setItem('monica:creator-prompt', sourcePrompt);
    window.location.href = '/';
  }

  return (
    <div className="space-y-4">
      {actionError ? <ErrorNotice message={actionError} /> : null}
      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <ImageGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyNotice message={copy.empty} />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 *:mb-4">
          {items.map((publicImage) => (
            <PublicImageCard
              key={publicImage.publicImageId}
              publicImage={publicImage}
              copy={copy}
              onOpen={() => setActiveImage(publicImage)}
              onSave={() => void toggleSave(publicImage.publicImageId)}
            />
          ))}
        </div>
      )}
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />

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
                  <button type="button" onClick={handleUseImagePrompt} className="monica-button-primary flex-1">
                    {copy.usePrompt}
                  </button>
                  <button type="button" onClick={() => void toggleSave(activeImage.publicImageId)} className="grid size-11 shrink-0 place-items-center rounded-md border border-border hover:bg-muted" aria-label={copy.actions.save}>
                    <Heart className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
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
  copy: PublicImageGalleryCopy;
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

export function EmptyNotice({ message }: { message: string }) {
  return <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">{message}</div>;
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-100">{message}</div>;
}

export function PaginationControls({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
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

function ImageGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => <div key={index} className="aspect-4/5 animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}
