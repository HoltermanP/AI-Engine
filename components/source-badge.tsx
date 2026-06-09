import { Badge } from '@/components/ui/badge';
import type { ConnectorMode } from '@/lib/connectors/types';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  source: ConnectorMode;
  className?: string;
}

/** Toont alleen een badge bij live databronnen — geen label voor lokale/voorbeelddata. */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  if (source !== 'live') return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono text-[10px] uppercase tracking-wider',
        'border-[#2D6FE8] bg-[#2D6FE8]/10 text-[#2D6FE8]',
        className
      )}
    >
      LIVE
    </Badge>
  );
}
