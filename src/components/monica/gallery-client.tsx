'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MonicaGalleryCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import type { Pagination, PagedResult } from './list-components';
import { PublicImageGallery, type PublicImage } from './public-image-gallery';

type GalleryFilters = Record<string, unknown>;
const pageSize = 20;

export function GalleryClient({
  copy,
  initialItems,
  initialPagination,
}: {
  copy: MonicaGalleryCopy;
  initialItems: PublicImage[];
  initialPagination: Pagination;
}) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || pagination.page >= pagination.totalPages) return;

    loadingRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch('/api/monica/gallery/images/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          page: pagination.page + 1,
          pageSize,
          sortBy: 'newest',
          filters: {} satisfies GalleryFilters,
        }),
      });
      if (!response.ok) throw new Error(response.statusText);

      const result = await response.json() as PagedResult<PublicImage>;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.publicImageId));
        return [...current, ...(result.items ?? []).filter((item) => !seen.has(item.publicImageId))];
      });
      setPagination(result.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [pagination.page, pagination.totalPages]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || pagination.page >= pagination.totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, pagination.page, pagination.totalPages]);

  return (
    <section className="monica-surface min-h-screen py-12 md:py-16">
      <div className={monicaContentWidthClass}>
        <div className="mb-8 max-w-3xl">
          <h1 className="text-4xl font-semibold text-foreground md:text-5xl">{copy.title}</h1>
          <p className="text-lg leading-8 text-muted-foreground">{copy.description}</p>
        </div>
        <PublicImageGallery
          items={items}
          loading={false}
          error={error}
          pagination={pagination}
          onPageChange={() => undefined}
          onReload={() => undefined}
          copy={copy}
          infinite={{ hasMore: pagination.page < pagination.totalPages, loading: loadingMore, sentinelRef }}
        />
      </div>
    </section>
  );
}
