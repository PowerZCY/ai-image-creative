'use client';

import type { MonicaExploreCopy, MonicaThemeCopy } from './copy';
import { useMonicaPagedList } from './list-components';
import { PublicImageGallery, type PublicImage } from './public-image-gallery';

export function ThemeGalleryClient({ themeId, copy, galleryCopy }: { themeId: string; copy: MonicaThemeCopy; galleryCopy: MonicaExploreCopy }) {
  const gallery = useMonicaPagedList<{ keyword: string; themeId: string }, PublicImage>({
    endpoint: '/api/monica/explore/images/search',
    initialFilters: { keyword: '', themeId },
    initialSortBy: 'featured',
    pageSize: 12,
  });

  return (
    <>
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-foreground">{copy.galleryTitle}</h2>
      </div>

      <PublicImageGallery
        items={gallery.items}
        loading={gallery.loading}
        error={gallery.error}
        pagination={gallery.pagination}
        onPageChange={gallery.setPage}
        onReload={gallery.reload}
        copy={galleryCopy}
      />
    </>
  );
}
