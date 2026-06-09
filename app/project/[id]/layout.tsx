import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { ProjectProcessProvider } from '@/components/project-process-provider';
import { getProject } from '@/lib/db/store';
import { DEMO_USER } from '@/lib/auth';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <ProjectProcessProvider projectId={id}>
      <AppShell userName={DEMO_USER.naam}>{children}</AppShell>
    </ProjectProcessProvider>
  );
}
