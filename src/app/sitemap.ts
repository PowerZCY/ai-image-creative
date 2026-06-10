import { appConfig } from '@/lib/appConfig';
import { resolveMdxSourceDir } from "@/lib/mdx-source";
import { createSitemapHandler } from '@windrun-huaiin/third-ui/lib/server';

export default createSitemapHandler(
  appConfig.baseUrl,
  appConfig.i18n.locales as string[],
  resolveMdxSourceDir('blog'),
);