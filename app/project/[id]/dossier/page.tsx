import { redirect } from 'next/navigation';

export default async function dossierRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/project/${id}?stap=dossier`);
}
