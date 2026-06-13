
import { MonicaCreator } from '@/components/monica/creator-client';
import { getMonicaCreatorCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { FingerprintStatus } from '@windrun-huaiin/third-ui/fingerprint';
import { GradientButton } from '@windrun-huaiin/third-ui/main/buttons';
import { CTA, FAQ, Features, Gallery, SeoContent, Tips, Usage } from '@windrun-huaiin/third-ui/main/home/server';
import { getTranslations } from "next-intl/server";
import Image from 'next/image';
import Link from 'next/link';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const forceShow = process.env.SHOW_FINGERPRINT_STATUS === 'true'
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'gallery' });
  const [creatorCopy, themeCopy] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
  ]);

  return (
    <>
      { (forceShow || isDev) && <FingerprintStatus />}
      <MonicaCreator copy={creatorCopy} />
      <section className="px-4 pb-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-emerald-100">
              {themeCopy.eyebrow}
            </div>
            <h2 className="text-3xl font-semibold text-white md:text-5xl">{themeCopy.homeTitle}</h2>
            <p className="max-w-2xl text-base leading-7 text-zinc-300">{themeCopy.homeDescription}</p>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
              {themeCopy.stats.slice(0, 2).map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1">{item}</span>
              ))}
            </div>
            <Link
              href="/theme"
              className="inline-flex h-11 items-center rounded-md bg-emerald-300 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
            >
              {themeCopy.homeCta}
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {themeCopy.gallery.slice(0, 3).map((image, index) => (
              <div key={image.title} className={index === 0 ? 'col-span-2 row-span-2' : ''}>
                <Image
                  src={image.imageUrl}
                  alt={image.alt}
                  width={index === 0 ? 720 : 360}
                  height={index === 0 ? 720 : 360}
                  className="aspect-square w-full rounded-lg object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <h3 className="mb-5 text-xl font-semibold text-white">{themeCopy.recentTitle}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {themeCopy.recent.map((theme) => (
              <article key={theme.title} className="rounded-lg border border-white/10 bg-zinc-950/70 p-5">
                <div className="text-xs text-emerald-100">{theme.label}</div>
                <h4 className="mt-3 text-lg font-semibold text-white">{theme.title}</h4>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{theme.brief}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Gallery
        locale={locale}
        button={
          <GradientButton
            title={t("button.title")}
            href={t("button.href")}
            align={t("button.align") as "center" | "left" | "right"}
          />
        }
      />
      <Usage locale={locale} />
      <Features locale={locale} />
      <Tips locale={locale} />
      <FAQ locale={locale} />
      <SeoContent locale={locale} />
      <CTA locale={locale} />
    </>
  );
}
