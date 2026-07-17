import { AdminReviewClient } from '@/components/monica/admin-review-client';
import { notFound } from 'next/navigation';
import { getOptionalServerAuthUser } from '@windrun-huaiin/backend-core/auth/server';
import { isMonicaAdmin } from '@/server/monica/auth';

export default async function AdminThemesPage() {
  const authenticated = await getOptionalServerAuthUser();
  if (!isMonicaAdmin(authenticated?.providerUserId)) notFound();
  return <AdminReviewClient initialTab="themes" initialThemeAdminTab="manage_themes" />;
}
