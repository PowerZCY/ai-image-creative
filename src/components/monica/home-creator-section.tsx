import { MonicaCreator } from './creator-client';
import type { MonicaCreatorCopy } from './copy';
import { MonicaPricingModalProvider } from './monica-pricing-modal-provider';
import type { MoneyPriceConfig, MoneyPriceData } from '@windrun-huaiin/third-ui/main/money-price';

type HomeCreatorTheme = {
  id?: string | number | bigint | null;
  title?: string | null;
  description?: string | null;
  generatorIdeas?: unknown[];
};

export function HomeCreatorSection({
  copy,
  theme,
  pricingData,
  pricingConfig,
}: {
  copy: MonicaCreatorCopy;
  theme?: HomeCreatorTheme | null;
  pricingData: MoneyPriceData;
  pricingConfig: MoneyPriceConfig;
}) {
  return (
    <MonicaPricingModalProvider data={pricingData} config={pricingConfig}>
      <MonicaCreator
        copy={copy}
        sourcePage="home"
        mode="home"
        themeId={theme?.id}
        themeLabel={theme?.title}
        themeNote={theme?.description}
        starterIdeas={theme?.generatorIdeas ?? []}
      />
    </MonicaPricingModalProvider>
  );
}
