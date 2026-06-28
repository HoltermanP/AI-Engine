import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string; traceId: string }>;
  searchParams: Promise<{ fase?: string; actie?: string }>;
}

export default async function TraceRedirect({ params, searchParams }: Props) {
  const { id, traceId } = await params;
  const { fase, actie } = await searchParams;
  const qs = new URLSearchParams({ stap: 'trace', traceId });
  if (fase) qs.set('fase', fase);
  if (actie) qs.set('actie', actie);
  redirect(`/project/${id}?${qs.toString()}`);
}
