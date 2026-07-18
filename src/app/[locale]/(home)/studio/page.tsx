import { StudioClient } from '@/components/monica/studio-client';
import { getMonicaCreatorCopy, getMonicaStudioCopy } from '@/components/monica/copy-server';
import { MonicaPricingModalProvider } from '@/components/monica/monica-pricing-modal-provider';
import { moneyPriceConfig } from '@windrun-huaiin/backend-core/config/money-price';
import { buildMoneyPriceData } from '@windrun-huaiin/third-ui/main/money-price/server';

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [copy, creatorCopy, pricingData] = await Promise.all([
    getMonicaStudioCopy(locale),
    getMonicaCreatorCopy(locale),
    buildMoneyPriceData({
      locale,
      currency: moneyPriceConfig.display.currency,
      enabledBillingTypes: ['onetime'],
    }),
  ]);

  return (
    <MonicaPricingModalProvider data={pricingData} config={moneyPriceConfig}>
      <StudioClient copy={copy} creatorCopy={creatorCopy} />
    </MonicaPricingModalProvider>
  );
}
