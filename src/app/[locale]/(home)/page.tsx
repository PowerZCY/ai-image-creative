
import { getMonicaCreatorCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { HomeCreatorSection } from '@/components/monica/home-creator-section';
import { HomeThemeSection } from '@/components/monica/home-theme-section';
import { themeService } from '@/server/monica/services/theme.service';
import { FingerprintStatus } from '@windrun-huaiin/third-ui/fingerprint';
import { CTA, FAQ, Features, SeoContent, Tips, Usage } from '@windrun-huaiin/third-ui/main/home/server';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const forceShow = process.env.SHOW_FINGERPRINT_STATUS === 'true';
  const { locale } = await params;
  const [creatorCopy, themeCopy, publicThemes] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
    themeService.listPublicThemes(),
  ]);

  return (
    <>
      { (forceShow || isDev) && <FingerprintStatus />}
      <HomeCreatorSection copy={creatorCopy} />
      <HomeThemeSection copy={themeCopy} themes={publicThemes} />
      <Usage locale={locale} />
      <Features locale={locale} />
      <Tips locale={locale} />
      <FAQ locale={locale} />
      <SeoContent locale={locale} />
      <CTA locale={locale} />
    </>
  );
}
