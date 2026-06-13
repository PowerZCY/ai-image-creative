import { ExploreClient } from '@/components/monica/explore-client';
import { getMonicaExploreCopy } from '@/components/monica/copy-server';

export default async function ExplorePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = await getMonicaExploreCopy(locale);

  return <ExploreClient copy={copy} />;
}
