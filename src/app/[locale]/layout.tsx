import { appConfig, generatedLocales, localePrefixAsNeeded, defaultLocale, themeMode } from '@/lib/appConfig';
import { getFumaTranslations } from '@windrun-huaiin/third-ui/fuma/fuma-translate-util';
import { createLocalizedPageMetadata, createLocalizedSiteMetadata } from '@windrun-huaiin/third-ui/lib/seo-metadata';
import { NProgressBar } from '@windrun-huaiin/third-ui/main';
import { DocsRootProvider } from '@windrun-huaiin/third-ui/fuma/base/docs-root-provider';
import { ClerkProviderClient } from '@windrun-huaiin/third-ui/clerk';
import { appSans } from '@/lib/fonts';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import './globals.css';
import React from 'react';

// 7 days
export const revalidate = 604800;

export function generateStaticParams() {
  return appConfig.i18n.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: paramsPromise
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await paramsPromise;
  const siteMetadata = await createLocalizedSiteMetadata({
    locale,
    baseUrl: appConfig.baseUrl,
    locales: appConfig.i18n.locales,
    defaultLocale: appConfig.i18n.defaultLocale,
    localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
  });

  return createLocalizedPageMetadata({
    url: {
      locale,
      pathname: '/',
      baseUrl: appConfig.baseUrl,
      locales: appConfig.i18n.locales,
      defaultLocale: appConfig.i18n.defaultLocale,
      localePrefixAsNeeded: appConfig.i18n.localePrefixAsNeeded,
    },
    site: siteMetadata,
  });
}

export default async function RootLayout({
  children,
  params: paramsPromise
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await paramsPromise;
  setRequestLocale(locale);
  const messages = await getMessages();
  const fumaTranslations = await getFumaTranslations(locale);

  return (
    <html lang={locale} className={appSans.variable} suppressHydrationWarning>
      <NextIntlClientProvider messages={messages}>
        <body>
          <NProgressBar />
          <ClerkProviderClient locale={locale} localePrefixAsNeeded={localePrefixAsNeeded} defaultLocale={defaultLocale}>
            <DocsRootProvider
            theme={{
              mode: themeMode,
            }}
              i18n={{
                locale: locale,
                locales: generatedLocales,
                translations: fumaTranslations,
              }}
            >
              {children}
            </DocsRootProvider>
          </ClerkProviderClient>
        </body>
        {/* GoogleAnalysisScript Or MicrosoftAnalysisScript */}
      </NextIntlClientProvider>
    </html>
  )
}
