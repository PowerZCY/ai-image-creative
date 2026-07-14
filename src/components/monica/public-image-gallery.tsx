'use client';

import { useState } from 'react';
import type { RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ImagePlus } from 'lucide-react';
import type { Pagination } from './list-components';

export type PublicImage = {
  publicImageId: string;
  title?: string | null;
  altText?: string | null;
  creationNote?: string | null;
  promptUsed?: string | null;
  likeCount: number;
  saveCount: number;
  image: {
    imageId?: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  theme?: { id: string; title: string; brief?: string | null } | null;
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
  infinite,
}: {
  items: PublicImage[];
  loading: boolean;
  error: string | null;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onReload: () => void;
  copy: PublicImageGalleryCopy;
  infinite?: { hasMore: boolean; loading: boolean; sentinelRef: RefObject<HTMLDivElement | null> };
}) {
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
              onSave={() => void toggleSave(publicImage.publicImageId)}
            />
          ))}
        </div>
      )}
      {infinite ? <InfiniteLoadIndicator {...infinite} /> : <PaginationControls pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}

function PublicImageCard({
  publicImage,
  copy,
  onSave,
}: {
  publicImage: PublicImage;
  copy: PublicImageGalleryCopy;
  onSave: () => void;
}) {
  const imageUrl = publicImage.image?.thumbnailUrl || publicImage.image?.imageUrl;
  const imageAlt = publicImage.altText || publicImage.title || '';
  const detailHref = `/images/${publicImage.publicImageId}`;
  return (
    <article className="group block w-full break-inside-avoid overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-md">
      <Link href={detailHref} className="block w-full overflow-hidden bg-muted text-left" aria-label={copy.openDetail}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={publicImage.image?.width ?? 1024}
            height={publicImage.image?.height ?? 1280}
            className="h-auto w-full transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid aspect-4/5 place-items-center text-muted-foreground"><ImagePlus className="size-8" /></div>
        )}
      </Link>
      <div className="flex items-start justify-between gap-3 p-4">
        <Link href={detailHref} className="min-w-0 flex-1 text-left" aria-label={copy.openDetail}>
          <h2 className="line-clamp-1 font-semibold leading-snug">{publicImage.title || copy.untitled}</h2>
          {publicImage.creationNote ? (
            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-muted-foreground">{publicImage.creationNote}</p>
          ) : null}
        </Link>
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

function InfiniteLoadIndicator({
  hasMore,
  loading,
  sentinelRef,
}: {
  hasMore: boolean;
  loading: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  if (!hasMore) return null;
  return (
    <div ref={sentinelRef} className="py-4" aria-live="polite">
      {loading ? <ImageGridSkeleton count={4} /> : <span className="sr-only">Load more images</span>}
    </div>
  );
}

function ImageGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => <div key={index} className="aspect-4/5 animate-pulse rounded-lg bg-muted" />)}
    </div>
  );
}
