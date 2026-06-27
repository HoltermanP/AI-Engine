import { notFound } from 'next/navigation';
import { getProject, getTraces } from '@/lib/db/store';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { BodemVooronderzoekWorkspace } from '@/components/bodem-vooronderzoek-workspace';

interface BodemPageProps {
  params: Promise<{ id: string }>;
}

export default async function BodemPage({ params }: BodemPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const traces = await getTraces(id);
  const keuzes = traces.map((t) => ({
    id: t.id,
    code: t.code,
    naam: t.naam,
    coordinates: t.coordinates,
  }));

  return (
    <PageContainer>
      <PageHero
        eyebrow="Stap 4 · Bodemvooronderzoek"
        title="Bodemvooronderzoek (NEN 5725-assistent)"
        subtitle="Aggregeert openbare bodemdata langs het tracé en markeert expliciet welk vooronderzoek mens-werk blijft. Geen vervanging van het vooronderzoek."
        backLink={{ href: `/project/${id}`, label: 'Terug naar projectoverzicht' }}
      />
      <BodemVooronderzoekWorkspace projectId={id} traces={keuzes} />
    </PageContainer>
  );
}
