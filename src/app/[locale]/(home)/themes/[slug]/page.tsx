import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaExploreCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { monicaContentWidthClass } from '@/components/monica/layout';
import { ThemeGalleryClient } from '@/components/monica/theme-gallery-client';
import { themeService } from '@/server/monica/services/theme.service';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [creatorCopy, themeCopy, exploreCopy] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
    getMonicaExploreCopy(locale),
  ]);
  const dbTheme = await themeService.findPublicThemeBySlug(slug);

  if (!dbTheme) {
    notFound();
  }

  const title = dbTheme.title;
  const description = dbTheme.description ?? dbTheme.brief ?? themeCopy.homeDescription;
  const tags = dbTheme.tags as string[];
  const starterIdeas = dbTheme.generatorIdeas ?? [];

  return (
    <div className="monica-surface min-h-screen">
      <section className="px-4 pb-8 pt-20 md:px-8 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6">
            <Link href="/themes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to themes
            </Link>
          </div>
          <h1 className="text-4xl font-medium leading-tight text-foreground md:text-5xl">
            {title}
          </h1>
          {description ? (
            <div className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {description}
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div className="mx-auto mt-6 flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground/70">
              {tags.map((tag, index) => (
                <span key={tag} className="flex items-center gap-2">
                  <span>{tag}</span>
                  {index < tags.length - 1 ? <span aria-hidden="true">&bull;</span> : null}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <MonicaCreator copy={creatorCopy} themeId={dbTheme.id} sourcePage="theme_detail" mode="theme_detail" starterIdeas={starterIdeas} />

      <section className="px-4 pt-16 pb-24 md:px-8">
        <div className={monicaContentWidthClass}>
          <ThemeGalleryClient themeId={dbTheme.id.toString()} copy={themeCopy} galleryCopy={exploreCopy} />
        </div>
      </section>
    </div>
  );
}
