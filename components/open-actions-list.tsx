import { ProjectActionsPanel } from '@/components/project-actions-panel';
import type { ProjectAction } from '@/demo/project-actions';

interface OpenActionsListProps {
  actions: ProjectAction[];
  projectNames?: Record<string, string>;
  limit?: number;
}

/** @deprecated Gebruik ProjectActionsPanel — behouden voor backward compatibility */
export function OpenActionsList({ actions, projectNames, limit }: OpenActionsListProps) {
  return (
    <ProjectActionsPanel
      actions={actions}
      projectNames={projectNames}
      showProjectName={!!projectNames}
      limit={limit}
      defaultFilter="te_doen"
      showSummary={false}
    />
  );
}
