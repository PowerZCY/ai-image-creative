import { StudioClient } from '@/components/monica/studio-client';
import { getMonicaCreatorCopy, getMonicaStudioCopy } from '@/components/monica/copy-server';

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [copy, creatorCopy] = await Promise.all([
    getMonicaStudioCopy(locale),
    getMonicaCreatorCopy(locale),
  ]);

  return <StudioClient copy={copy} creatorCopy={creatorCopy} />;
}
