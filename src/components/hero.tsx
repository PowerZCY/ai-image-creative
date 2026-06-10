import { getTranslations } from 'next-intl/server'
import { ZapIcon} from '@windrun-huaiin/base-ui/icons'
import { GradientButton } from '@windrun-huaiin/third-ui/main/buttons'
import { HeroMedia, HeroSection } from '@windrun-huaiin/third-ui/main/hero';
import { themeHeroEyesOnClass } from '@windrun-huaiin/base-ui/lib'
import { cn } from '@windrun-huaiin/lib/utils';

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'hero' });

  return (
    <HeroSection
      content={
        <>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            {t('mainTitle')}<br />{" "}
            <span className={cn("bg-clip-text text-transparent", themeHeroEyesOnClass)}>{t('mainEyesOn')}</span>
          </h1>
          <p className="max-w-2xl text-lg text-gray-400">
            {t('description')}
          </p>
          <GradientButton
            title={t('button')}
            href="https://d8ger.com/test/color"
            align="center"
            className="md:w-full"
          />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ZapIcon className="h-4 w-4" />
            <span>{t('about')}</span>
          </div>
        </>
      }
      media={
        <HeroMedia
          src={t('heroImageUrl')}
          alt={t('heroImageAlt')}
          width={890}
          height={569}
          preload
        />
      }
    />
  )
}
