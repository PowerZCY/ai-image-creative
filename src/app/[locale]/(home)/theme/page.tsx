import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import {
  themeBgColor,
  themeBorderColor,
  themeButtonGradientClass,
  themeHeroEyesOnClass,
  themeIconColor,
} from '@windrun-huaiin/base-ui/lib';
import { cn } from '@windrun-huaiin/lib/utils';
import Image from 'next/image';

export default async function ThemePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [creatorCopy, themeCopy] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
  ]);

  return (
    <>
      <section className="px-4 pb-10 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-5xl text-center">
          <div className={cn('mx-auto inline-flex rounded-full border px-3 py-1 text-sm', themeBgColor, themeBorderColor, themeIconColor)}>
            {themeCopy.date}
          </div>
          <h1 className={cn('mt-5 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl', themeHeroEyesOnClass)}>
            {themeCopy.title}
          </h1>
          <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left text-sm leading-6 text-muted-foreground md:grid-cols-2">
            {themeCopy.notes.map((note) => (
              <p key={note} className="rounded-lg border border-border bg-card/60 p-4">
                {note}
              </p>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {themeCopy.submissionHint}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {themeCopy.stats.map((item) => (
              <span key={item} className="rounded-full border border-border bg-muted/50 px-3 py-1">{item}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {themeCopy.tags.map((tag) => (
              <span key={tag} className={cn('rounded-full border px-3 py-1 text-xs', themeBgColor, themeBorderColor, themeIconColor)}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <MonicaCreator copy={creatorCopy} />

      <section className="px-4 pb-24 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <h2 className="text-2xl font-semibold text-foreground">{themeCopy.galleryTitle}</h2>
            <div className="flex rounded-md border border-border bg-muted/50 p-1">
              {Object.values(themeCopy.galleryTabs).map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    'h-9 rounded px-3 text-sm transition',
                    index === 0
                      ? cn('text-white', themeButtonGradientClass)
                      : 'text-muted-foreground hover:bg-background hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {themeCopy.gallery.map((image) => (
              <article key={image.title} className="overflow-hidden rounded-lg border border-border bg-card">
                <Image
                  src={image.imageUrl}
                  alt={image.alt}
                  width={720}
                  height={720}
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{image.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{image.author}</p>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{image.prompt}</p>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
