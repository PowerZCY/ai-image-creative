import { StudioClient } from '@/components/monica/studio-client';
import { getMonicaStudioCopy } from '@/components/monica/copy-server';

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = await getMonicaStudioCopy(locale);

  return <StudioClient copy={copy} />;
}
