import { redirect } from 'next/navigation';

export default async function bodemRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/project/${id}?stap=bodem`);
}
