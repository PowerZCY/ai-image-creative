import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ImagePlus } from 'lucide-react';

export type SharedThemeItem = {
  id?: string | number | bigint | null;
  issueNumber?: number | null;
  title: string;
  brief?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  featuredImages?: Array<{
    id?: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    title?: string | null;
    altText?: string | null;
  } | null>;
  slug: string;
  publishDate?: Date | string | null;
};

export type ThemeDiscoveryCardProps = {
  theme: SharedThemeItem;
  /**
   * Optional custom element to replace the default Date/Issue Number display
   * at the top left of the card.
   */
  eyebrow?: React.ReactNode;
  /**
   * Hide the metadata row when the surrounding section already labels the card.
   */
  hideMeta?: boolean;
  /**
   * Fallback text for the description if both brief and description are missing.
   */
  emptyDescriptionFallback?: string;
  /**
   * Text for the View Theme button. Defaults to "View Theme".
   */
  viewThemeText?: string;
};

export function formatThemeDate(value?: Date | string | null) {
  if (!value) return 'Theme';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value as string;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getThemeHref(theme: SharedThemeItem) {
  return `/themes/${theme.slug}`;
}

export function ThemeDiscoveryCard({ theme, eyebrow, hideMeta = false, emptyDescriptionFallback = 'Explore this theme.', viewThemeText = 'View theme' }: ThemeDiscoveryCardProps) {
  const href = getThemeHref(theme);
  const featuredCount = theme.featuredImages?.filter(Boolean).length ?? 0;
  
  return (
    <article className="group grid gap-6 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-center md:gap-8 md:p-6">
      <div className="flex min-w-0 flex-col">
        {hideMeta ? null : (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {eyebrow ? (
              eyebrow
            ) : (
              <>
                {theme.issueNumber ? <span className="text-emerald-600">Issue #{theme.issueNumber}</span> : null}
                {theme.issueNumber ? <span aria-hidden className="text-border">·</span> : null}
                <span>{formatThemeDate(theme.publishDate)}</span>
              </>
            )}
          </div>
        )}
        <h2 className={hideMeta ? 'text-2xl font-bold leading-tight tracking-normal text-foreground' : 'mt-3 text-2xl font-bold leading-tight tracking-normal text-foreground'}>{theme.title}</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">{theme.brief || theme.description || emptyDescriptionFallback}</p>
        <div className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm">
          <span className="font-semibold text-foreground">{featuredCount}</span>
          <span className="text-muted-foreground">featured</span>
        </div>
        <Link href={href} className="mt-5 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-transparent px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted">
          {viewThemeText}
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <HorizontalThemeFeaturedPreview theme={theme} />
    </article>
  );
}

function HorizontalThemeFeaturedPreview({ theme }: { theme: SharedThemeItem }) {
  const images = theme.featuredImages
    ?.map((image) => image && {
      url: image.thumbnailUrl || image.imageUrl,
      alt: image.altText || image.title || `${theme.title} featured image`,
    })
    .filter((image): image is { url: string; alt: string } => Boolean(image?.url)) ?? [];
  const slots = Array.from({ length: 3 }, (_, index) => images[index] ?? null);
  
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {slots.map((image, index) => (
        <div key={`${image?.url ?? 'empty'}-${index}`} className="relative flex aspect-[3/4] w-full flex-col justify-center overflow-hidden rounded-xl bg-muted">
          {image ? (
            <>
              <div aria-hidden className="absolute inset-0 flex flex-col justify-end gap-2 p-3">
                <div className="h-2 w-4/5 rounded-sm bg-background/50" />
                <div className="h-2 w-3/5 rounded-sm bg-background/35" />
              </div>
              <Image
                src={image.url}
                alt={image.alt}
                width={450}
                height={600}
                quality={75}
                sizes="(min-width: 768px) 15vw, 29vw"
                className="relative z-10 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </>
          ) : (
            <div className="grid aspect-square w-full place-items-center text-muted-foreground/60">
              <ImagePlus className="size-7" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
