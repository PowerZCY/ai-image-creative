
import { getMonicaCreatorCopy, getMonicaThemeCopy } from '@/components/monica/copy-server';
import { HomeCreatorSection } from '@/components/monica/home-creator-section';
import { HomeThemeSection } from '@/components/monica/home-theme-section';
import { moneyPriceConfig } from '@windrun-huaiin/backend-core/config/money-price';
import { buildMoneyPriceData } from '@windrun-huaiin/third-ui/main/money-price/server';
import { themeService } from '@/server/monica/services/theme.service';
import { FingerprintStatus } from '@windrun-huaiin/third-ui/fingerprint';
import { CTA, FAQ, Features, SeoContent, Tips, Usage } from '@windrun-huaiin/third-ui/main/home/server';

// Refresh date-driven featured themes within 10 minutes of their scheduled change.
export const revalidate = 600;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const forceShow = process.env.SHOW_FINGERPRINT_STATUS === 'true';
  const { locale } = await params;
  const [creatorCopy, themeCopy, publicThemes, pricingData] = await Promise.all([
    getMonicaCreatorCopy(locale),
    getMonicaThemeCopy(locale),
    themeService.listHomeThemes(),
    buildMoneyPriceData({
      locale,
      currency: moneyPriceConfig.display.currency,
      enabledBillingTypes: ['onetime'],
    }),
  ]);
  const currentTheme = publicThemes[0] ?? null;

  return (
    <>
      { (forceShow || isDev) && <FingerprintStatus />}
      <HomeCreatorSection
        copy={creatorCopy}
        theme={currentTheme}
        pricingData={pricingData}
        pricingConfig={moneyPriceConfig}
      />
      <HomeThemeSection copy={themeCopy} themes={publicThemes} />
      <section className="px-4 pb-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <details className="group rounded-lg border border-border bg-card/50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-foreground marker:hidden">
              <span>Learn more about Monica AI image creation</span>
              <span className="text-muted-foreground transition group-open:rotate-180">v</span>
            </summary>
            <div className="border-t border-border">
              <Usage locale={locale} />
              <Features locale={locale} />
              <Tips locale={locale} />
              <FAQ locale={locale} />
              <SeoContent locale={locale} />
              <CTA locale={locale} />
            </div>
          </details>
        </div>
      </section>
    </>
  );
}
