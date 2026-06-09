'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getFirstTraceIdAction } from '@/lib/actions/data';
import { extractTraceIdFromPath } from '@/lib/navigation/project-process';

interface ProjectProcessContextValue {
  projectId: string;
  firstTraceId: string | null;
  /** Huidig tracé uit URL, anders eerste tracé van het project */
  traceLinkId: string | null;
}

const ProjectProcessContext = createContext<ProjectProcessContextValue | null>(null);

interface ProjectProcessProviderProps {
  projectId: string;
  children: React.ReactNode;
}

export function ProjectProcessProvider({ projectId, children }: ProjectProcessProviderProps) {
  const pathname = usePathname();
  const activeTraceId = extractTraceIdFromPath(pathname);
  const [firstTraceId, setFirstTraceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFirstTraceIdAction(projectId).then((id) => {
      if (!cancelled) setFirstTraceId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const value = useMemo(
    (): ProjectProcessContextValue => ({
      projectId,
      firstTraceId,
      traceLinkId: activeTraceId ?? firstTraceId,
    }),
    [projectId, firstTraceId, activeTraceId]
  );

  return (
    <ProjectProcessContext.Provider value={value}>{children}</ProjectProcessContext.Provider>
  );
}

export function useProjectProcess(): ProjectProcessContextValue | null {
  return useContext(ProjectProcessContext);
}
