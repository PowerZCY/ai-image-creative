'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export type PreviewImage = {
  imageId: string;
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

export function ImagePreviewDialog({
  open,
  images,
  initialImageId,
  onOpenChange,
  renderActions,
}: {
  open: boolean;
  images: PreviewImage[];
  initialImageId?: string | null;
  onOpenChange: (open: boolean) => void;
  renderActions?: (image: PreviewImage) => ReactNode;
}) {
  const [activeImageId, setActiveImageId] = useState<string | null>(initialImageId ?? null);
  const activeIndex = useMemo(() => {
    const index = images.findIndex((image) => image.imageId === activeImageId);
    return index >= 0 ? index : 0;
  }, [activeImageId, images]);
  const activeImage = images[activeIndex];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!open || !hasMultipleImages) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') setActiveImageId(images[(activeIndex - 1 + images.length) % images.length]?.imageId ?? null);
      if (event.key === 'ArrowRight') setActiveImageId(images[(activeIndex + 1) % images.length]?.imageId ?? null);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, hasMultipleImages, images, open]);

  function move(offset: number) {
    setActiveImageId(images[(activeIndex + offset + images.length) % images.length]?.imageId ?? null);
  }

  if (!activeImage?.imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        showOverlay={false}
        className="fixed inset-x-0 bottom-0 top-[calc(var(--fd-banner-height)+var(--fd-header-height)+0.5rem)] z-[999] grid h-auto w-screen max-w-none translate-x-0 translate-y-0 place-items-center rounded-none border-0 bg-black/95 p-4 shadow-none ring-0 sm:max-w-none md:p-8"
        aria-label="Image preview"
      >
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 md:right-6 md:top-6">
          {renderActions ? <div className="flex items-center gap-2">{renderActions(activeImage)}</div> : null}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid size-10 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close preview"
          >
            <X className="size-5" />
          </button>
        </div>

        <Image
          src={activeImage.imageUrl}
          alt=""
          width={activeImage.width ?? 1024}
          height={activeImage.height ?? 1024}
          unoptimized
          className="h-[58vh] max-h-[620px] w-auto max-w-full rounded-md object-contain md:h-[68vh] md:max-h-[720px]"
        />

        {hasMultipleImages ? (
          <>
            <PreviewNavigationButton direction="previous" onClick={() => move(-1)} />
            <PreviewNavigationButton direction="next" onClick={() => move(1)} />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewNavigationButton({ direction, onClick }: { direction: 'previous' | 'next'; onClick: () => void }) {
  const isPrevious = direction === 'previous';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:size-12',
        isPrevious ? 'left-3 md:left-6' : 'right-3 md:right-6',
      )}
      aria-label={isPrevious ? 'Previous image' : 'Next image'}
    >
      {isPrevious ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
    </button>
  );
}
