import { Badge } from '@/components/ui/badge';
import type { ProjectStatus } from '@/demo/projects';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<ProjectStatus, string> = {
  actief: 'border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[#2D6FE8]',
  concept: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  afgerond: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  gearchiveerd: 'border-border bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  actief: 'Actief',
  concept: 'Concept',
  afgerond: 'Afgerond',
  gearchiveerd: 'Gearchiveerd',
};

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
