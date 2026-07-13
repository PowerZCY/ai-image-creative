import { ThemesIndexClient } from '@/components/monica/themes-index-client';
import { getMonicaThemesCopy } from '@/components/monica/copy-server';

export default async function ThemesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = await getMonicaThemesCopy(locale);

  return <ThemesIndexClient copy={copy} />;
}
