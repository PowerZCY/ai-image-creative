import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
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
          <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-emerald-100">
            {themeCopy.date}
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-white md:text-6xl">
            {themeCopy.title}
          </h1>
          <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left text-sm leading-6 text-zinc-300 md:grid-cols-2">
            {themeCopy.notes.map((note) => (
              <p key={note} className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                {note}
              </p>
            ))}
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-zinc-400">
            {themeCopy.submissionHint}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs text-zinc-300">
            {themeCopy.stats.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1">{item}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {themeCopy.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
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
            <h2 className="text-2xl font-semibold text-white">{themeCopy.galleryTitle}</h2>
            <div className="flex rounded-md border border-white/10 bg-zinc-950 p-1">
              {Object.values(themeCopy.galleryTabs).map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === 0 ? 'h-9 rounded bg-emerald-300 px-3 text-sm text-zinc-950' : 'h-9 rounded px-3 text-sm text-zinc-300'}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {themeCopy.gallery.map((image) => (
              <article key={image.title} className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
                <Image
                  src={image.imageUrl}
                  alt={image.alt}
                  width={720}
                  height={720}
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{image.title}</h3>
                    <p className="mt-1 text-xs text-zinc-500">{image.author}</p>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-zinc-400">{image.prompt}</p>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-300">
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
