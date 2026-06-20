'use client';

import Image from 'next/image';
import { ImagePlus } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { themeButtonGradientClass } from '@windrun-huaiin/base-ui/lib';
import type { MonicaThemeCopy } from './copy';
import { useMonicaPagedList } from './list-components';

type GalleryImage = {
  publicImageId: string;
  title?: string | null;
  promptUsed?: string | null;
  creationNote?: string | null;
  likeCount: number;
  publishedAt?: string | null;
  author?: { userName?: string | null; email?: string | null } | null;
  image: {
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
  } | null;
};

type GallerySort = 'featured' | 'most_liked' | 'newest';

export function ThemeGalleryClient({ themeId, copy }: { themeId: string; copy: MonicaThemeCopy }) {
  const gallery = useMonicaPagedList<{ keyword: string; themeId: string }, GalleryImage>({
    endpoint: '/api/monica/explore/images/search',
    initialFilters: { keyword: '', themeId },
    initialSortBy: 'featured',
    pageSize: 12,
  });
  const sort = (gallery.sortBy ?? 'featured') as GallerySort;
  const tabs: Array<{ value: GallerySort; label: string }> = [
    { value: 'featured', label: copy.galleryTabs.featured },
    { value: 'most_liked', label: copy.galleryTabs.mostLiked },
    { value: 'newest', label: copy.galleryTabs.newest },
  ];

  return (
    <>
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <h2 className="text-2xl font-semibold text-foreground">{copy.galleryTitle}</h2>
        <div className="flex rounded-md border border-border bg-muted/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => gallery.setSortBy(tab.value)}
              className={cn(
                'h-9 rounded px-3 text-sm transition',
                sort === tab.value ? cn('text-white', themeButtonGradientClass) : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {gallery.error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-100">
          {gallery.error}
        </div>
      ) : gallery.loading ? (
        <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">Loading gallery...</div>
      ) : gallery.items.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          Public gallery images will appear here after submissions are approved for this theme.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.items.map((item) => {
            const imageUrl = item.image?.thumbnailUrl || item.image?.imageUrl;
            return (
              <article key={item.publicImageId} className="overflow-hidden rounded-lg border border-border bg-card">
                {imageUrl ? (
                  <Image src={imageUrl} alt={item.title ?? ''} width={1024} height={1024} unoptimized className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center text-muted-foreground">
                    <ImagePlus className="size-8" />
                  </div>
                )}
                <div className="space-y-2 p-3">
                  <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{item.title || 'Untitled image'}</h3>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{item.promptUsed || item.creationNote || ''}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.author?.userName || item.author?.email || 'Creator'}</span>
                    <span>{item.likeCount} likes</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
