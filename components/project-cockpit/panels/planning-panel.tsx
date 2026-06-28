'use client';

import { useMemo } from 'react';
import { ProjectPlanningView } from '@/components/project-planning-view';
import { useCockpit, useCockpitMap } from '@/components/project-cockpit/cockpit-context';

/** Zijpaneel "Planning" — Gantt/activiteiten; kaart als read-only context. */
export function PlanningPanel() {
  const { projectId } = useCockpit();
  useCockpitMap(useMemo(() => ({ editable: false, defaultDrawMode: 'none' as const }), []));
  return (
    <div className="p-3">
      <ProjectPlanningView projectId={projectId} />
    </div>
  );
}
