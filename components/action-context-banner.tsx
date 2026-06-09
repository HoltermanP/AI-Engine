'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProjectAction } from '@/demo/project-actions';
import { completeActionAction } from '@/lib/actions/actions';
import { getActionNavigationTarget } from '@/lib/navigation/action-links';
import { ENGINEERING_WORKFLOW } from '@/lib/process/workflow';
import { TRACE_PHASES } from '@/lib/process/phases';
import { ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';

interface ActionContextBannerProps {
  action: ProjectAction;
  onDismiss?: () => void;
}

export function ActionContextBanner({ action, onDismiss }: ActionContextBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const target = getActionNavigationTarget(action);
  const phaseLabel = TRACE_PHASES.find((p) => p.id === target.fase)?.titel;
  const stepLabel = target.stap
    ? ENGINEERING_WORKFLOW.find((s) => s.id === target.stap)?.label
    : null;
  const isAfgerond = action.status === 'afgerond';

  function handleComplete() {
    startTransition(async () => {
      await completeActionAction(action.id);
      onDismiss?.();
      router.refresh();
    });
  }

  return (
    <div
      className={
        isAfgerond
          ? 'flex items-start gap-3 border-b border-emerald-500/30 bg-emerald-500/5 px-4 py-3'
          : 'flex items-start gap-3 border-b border-[#2D6FE8]/30 bg-[#2D6FE8]/5 px-4 py-3'
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-foreground">
            {isAfgerond ? 'Actie afgerond' : 'Actie uitvoeren'}
          </p>
          <Badge variant="outline" className="text-[10px]">
            {target.label}
          </Badge>
          {action.status === 'blokkerend' && !isAfgerond && (
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-[10px] text-red-600">
              Blokkerend
            </Badge>
          )}
          {isAfgerond && (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-700">
              Afgerond
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm font-medium text-foreground">{action.titel}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isAfgerond ? (
            <>Afgerond{action.afgerondOp ? ` op ${action.afgerondOp}` : ''}</>
          ) : (
            <>
              {phaseLabel && <>Voer uit in {phaseLabel}</>}
              {stepLabel && <> · {stepLabel}</>}
              {action.deadline && <> · deadline {action.deadline}</>}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!isAfgerond && (
          <Button
            size="sm"
            className="h-7 bg-[#2D6FE8] text-[10px] hover:bg-[#2D6FE8]/90"
            disabled={isPending}
            onClick={handleComplete}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Markeer afgerond
              </>
            )}
          </Button>
        )}
        <Link
          href="/acties"
          className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-[10px] font-medium transition-colors hover:bg-muted"
        >
          Alle acties
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
        {onDismiss && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onDismiss} aria-label="Sluiten">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
