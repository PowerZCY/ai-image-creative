import { defaultLocale, localePrefixAsNeeded } from '@/lib/appConfig';
import {
  SettingsIcon,
  BrainCircuitIcon,
  ImageUpIcon,
  SparklesIcon,
} from '@windrun-huaiin/base-ui/icons';
import { getAsNeededLocalizedUrl } from '@windrun-huaiin/lib/utils';
import {
  createLocalizedNavContext,
  createLocalizedNavLink,
} from '@windrun-huaiin/third-ui/fuma/base/nav-config';
import { type SiteNavItemConfig } from '@windrun-huaiin/third-ui/fuma/base/site-layout-shared';
import { getTranslations } from 'next-intl/server';
import { getOptionalServerAuthUser } from '@windrun-huaiin/backend-core/auth/server';
import { isMonicaAdmin } from '@/server/monica/auth';

function createNavContext(locale: string) {
  return createLocalizedNavContext({
    locale,
    localePrefixAsNeeded,
    defaultLocale,
    localizeHref: getAsNeededLocalizedUrl,
  });
}

export async function primaryNavLinks(locale: string): Promise<SiteNavItemConfig[]> {
  const t1 = await getTranslations({ locale, namespace: 'linkPreview' });
  const context = createNavContext(locale);
  const authenticated = await getOptionalServerAuthUser();
  const admin = isMonicaAdmin(authenticated?.providerUserId);

  const links: SiteNavItemConfig[] = [
    createLocalizedNavLink(
      {
        text: 'Themes',
        path: '/themes',
        prefetch: false,
        icon: <ImageUpIcon />,
      },
      context,
    ),
    createLocalizedNavLink(
      {
        text: 'Gallery',
        path: '/gallery',
        prefetch: false,
        icon: <ImageUpIcon />,
      },
      context,
    ),
    createLocalizedNavLink(
      {
        text: 'Submit Theme',
        path: '/submit-theme',
        prefetch: false,
        icon: <BrainCircuitIcon />,
      },
      context,
    ),
    createLocalizedNavLink(
      {
        text: 'Studio',
        path: '/studio',
        prefetch: false,
        icon: <SparklesIcon />,
      },
      context,
    ),
    createLocalizedNavLink(
      {
        text: t1('pricing'),
        path: '/pricing',
        prefetch: false,
      },
      context,
    ),
  ];

  if (admin) {
    links.splice(4, 0, createLocalizedNavLink(
      {
        text: 'Admin',
        path: '/admin/monica',
        prefetch: false,
        icon: <SettingsIcon />,
      },
      context,
    ));
  }

  return links;
}

export async function levelNavLinks(_locale: string): Promise<SiteNavItemConfig[]> {
  return [];
}
