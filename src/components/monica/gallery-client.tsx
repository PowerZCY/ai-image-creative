'use client';

import type { MonicaGalleryCopy } from './copy';
import { monicaContentWidthClass } from './layout';
import { useMonicaPagedList } from './list-components';
import { PublicImageGallery, type PublicImage } from './public-image-gallery';

type GalleryFilters = Record<string, unknown>;

export function GalleryClient({ copy }: { copy: MonicaGalleryCopy }) {
  const gallery = useMonicaPagedList<GalleryFilters, PublicImage>({
    endpoint: '/api/monica/gallery/images/list',
    initialFilters: {},
    initialSortBy: 'newest',
    pageSize: 12,
  });

  return (
    <section className="monica-surface min-h-screen py-12 md:py-16">
      <div className={monicaContentWidthClass}>
        <div className="mb-8 max-w-3xl">
          <p className="text-lg leading-8 text-muted-foreground">{copy.description}</p>
        </div>
        <PublicImageGallery
          items={gallery.items}
          loading={gallery.loading}
          error={gallery.error}
          pagination={gallery.pagination}
          onPageChange={gallery.setPage}
          onReload={gallery.reload}
          copy={copy}
        />
      </div>
    </section>
  );
}
