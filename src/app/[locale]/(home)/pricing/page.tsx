
import { appConfig } from '@/lib/appConfig';
import { createLocalizedMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { moneyPriceConfig } from '@windrun-huaiin/backend-core/config/money-price';
import { FingerprintStatus } from '@windrun-huaiin/third-ui/fingerprint';
import { buildMoneyPriceData } from '@windrun-huaiin/third-ui/main/money-price/server';
import { cn } from '@windrun-huaiin/lib/utils';
import { PricingClient } from './pricing-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return createLocalizedMetadata({
    namespace: 'metadata.pricing',
    url: {
      locale,
      pathname: '/pricing',
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    },
  });
}

export default async function Pricing({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  const forceShow = process.env.SHOW_FINGERPRINT_STATUS === 'true'
  const enableSubscriptionUpgrade = process.env.ENABLE_STRIPE_SUBSCRIPTION_UPGRADE !== 'false';
  const { locale } =  await params;
  const enabledBillingTypes = ['onetime'];
  const data = await buildMoneyPriceData({
    locale,
    currency: moneyPriceConfig.display.currency,
    enabledBillingTypes,
  });

  return (
    <>
      { (forceShow || isDev) && <FingerprintStatus />}
      <section id="money-pricing" className={cn("min-h-screen px-4 py-4 md:px-16 md:py-8 mx-auto max-w-7xl scroll-mt-10", 'mt-12')}>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          {data.title}
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4 text-base md:text-lg mx-auto">
          {data.subtitle}
        </p>
        <PricingClient
          data={data}
          config={moneyPriceConfig}
          checkoutApiEndpoint="/api/stripe/checkout"
          customerPortalApiEndpoint="/api/stripe/customer-portal"
          enableClerkModal={appConfig.style.clerkAuthInModal}
          enabledBillingTypes={enabledBillingTypes}
          enableSubscriptionUpgrade={enableSubscriptionUpgrade}
        />
      </section>
    </>
  );
}
