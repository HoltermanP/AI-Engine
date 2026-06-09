import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 80 ? 'bg-emerald-500' : clamped >= 50 ? 'bg-[#2D6FE8]' : clamped >= 25 ? 'bg-amber-500' : 'bg-muted-foreground/40';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/80 ring-1 ring-foreground/[0.04]">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', color)}
          style={{
            width: `${clamped}%`,
            background: clamped >= 80
              ? 'linear-gradient(90deg, #10b981, #34d399)'
              : clamped >= 50
                ? 'linear-gradient(90deg, #2D6FE8, #60a5fa)'
                : clamped >= 25
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span className="font-[family-name:var(--font-ibm-plex-mono)] text-xs text-muted-foreground">
          {clamped}%
        </span>
      )}
    </div>
  );
}
