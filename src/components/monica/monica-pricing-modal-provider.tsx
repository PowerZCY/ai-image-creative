'use client';

import { PricingModalProvider, type MoneyPriceConfig, type MoneyPriceData } from '@windrun-huaiin/third-ui/main/money-price';
import { appConfig } from '@/lib/appConfig';
import type { ReactNode } from 'react';

interface MonicaPricingModalProviderProps {
  children: ReactNode;
  data: MoneyPriceData;
  config: MoneyPriceConfig;
}

export function MonicaPricingModalProvider({
  children,
  data,
  config,
}: MonicaPricingModalProviderProps) {
  return (
    <PricingModalProvider
      data={data}
      config={config}
      checkoutApiEndpoint="/api/stripe/checkout"
      customerPortalApiEndpoint="/api/stripe/customer-portal"
      enableClerkModal={appConfig.style.clerkAuthInModal}
      enabledBillingTypes={['onetime']}
      mobileBillingSwitchBehavior="sticky"
      pricingContextEndpoint="/api/user/pricing-context"
    >
      {children}
    </PricingModalProvider>
  );
}
