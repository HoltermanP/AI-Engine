import { redirect } from 'next/navigation';

export default async function netontwerpRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/project/${id}?stap=netontwerp`);
}
