import Image from 'next/image';
import { Hash } from 'lucide-react';
import { cn } from '@windrun-huaiin/lib/utils';
import type { exploreService } from '@/server/monica/services/explore.service';
import type { MonicaExploreCopy } from './copy';
import { PublicImageCloseButton, PublicImageDetailActions, PublicImagePromptCopyButton } from './public-image-detail-actions';

type PublicImageDetail = NonNullable<Awaited<ReturnType<typeof exploreService.findPublicImageDetail>>>;

type PublicImageDetailViewProps = {
  publicImage: PublicImageDetail;
  copy: MonicaExploreCopy;
  closeMode?: 'back' | 'explore';
  className?: string;
};

export function PublicImageDetailView({
  publicImage,
  copy,
  closeMode = 'explore',
  className,
}: PublicImageDetailViewProps) {
  const imageUrl = publicImage.image?.imageUrl;
  const imageAlt = publicImage.altText || publicImage.title;
  const promptText = publicImage.promptUsed || publicImage.title;
  const imageWidth = publicImage.image?.width ?? 1400;
  const imageHeight = publicImage.image?.height ?? 1400;

  return (
    <div className={cn('bg-[var(--monica-bg)] text-[var(--monica-ink)]', className)}>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(340px,440px)]">
        <section className="relative flex min-h-[58vh] items-center justify-center bg-neutral-100/70 p-4 pt-20 md:p-8 md:pt-24 lg:min-h-screen lg:pt-8">
          <div className="absolute right-4 top-16 lg:hidden">
            <PublicImageCloseButton mode={closeMode} />
          </div>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={imageWidth}
              height={imageHeight}
              unoptimized
              priority
              className="h-[68vh] max-h-[720px] min-h-[360px] w-auto max-w-full rounded-xl object-contain shadow-sm lg:h-[82vh] lg:max-h-[860px]"
            />
          ) : (
            <div className="grid aspect-square w-full max-w-md place-items-center rounded-xl bg-muted text-muted-foreground">
              Image unavailable
            </div>
          )}
        </section>

        <aside className="flex max-h-none flex-col overflow-y-auto bg-background p-6 md:p-8 lg:max-h-screen lg:pt-20">
          <div className="mb-6 hidden justify-end lg:flex">
            <PublicImageCloseButton mode={closeMode} />
          </div>

          <div className="space-y-2 text-left">
            {publicImage.theme ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Hash className="size-3" />
                {publicImage.theme.title}
              </span>
            ) : null}
            <h1 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
              {publicImage.title || copy.untitled}
            </h1>
          </div>

          {publicImage.creationNote ? (
            <section className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creation note</h2>
              <p className="mt-1.5 text-sm leading-6 text-foreground">{publicImage.creationNote}</p>
            </section>
          ) : null}

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.prompt}</div>
              <PublicImagePromptCopyButton promptText={promptText} copiedLabel={copy.copied} />
            </div>
            <p className="mt-1.5 rounded-lg border border-border bg-muted/60 p-3 font-mono text-sm leading-6 text-foreground/90">
              {promptText}
            </p>
          </section>

          <div className="mt-6">
            <PublicImageDetailActions
              publicImageId={publicImage.publicImageId}
              usePromptLabel={copy.usePrompt}
              saveLabel={copy.actions.save}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
