import { Badge } from '@/components/ui/badge';
import {
  DELIVERABLE_STATUS_LABELS,
  type DeliverableStatus,
} from '@/lib/process/fasen';
import { cn } from '@/lib/utils';

/**
 * Statuskleuren consistent met de bestaande fase-/statuskleuren in de app:
 * groen (emerald) = definitief, blauw (#2D6FE8) = in review,
 * amber = concept, grijs = ontbreekt.
 */
const STATUS_COLORS: Record<DeliverableStatus, string> = {
  definitief:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  in_review: 'border-[#2D6FE8]/40 bg-[#2D6FE8]/10 text-[#2D6FE8]',
  concept: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  ontbreekt: 'border-border bg-muted/60 text-muted-foreground',
};

interface DeliverableStatusBadgeProps {
  status: DeliverableStatus;
  className?: string;
}

export function DeliverableStatusBadge({
  status,
  className,
}: DeliverableStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('shrink-0 text-[10px]', STATUS_COLORS[status], className)}
    >
      {DELIVERABLE_STATUS_LABELS[status]}
    </Badge>
  );
}
