'use client';

import { usePathname } from 'next/navigation';
import { ProcessStepper, type StepperStep } from '@/components/process-stepper';
import { useProjectProcess } from '@/components/project-process-provider';
import {
  getProjectProcessStepHref,
  PROJECT_PROCESS_STEPS,
  resolveProjectProcessStep,
  type ProjectProcessStepId,
} from '@/lib/navigation/project-process';
import type { StepperStatus } from '@/components/process-stepper';

interface ProjectProcessNavProps {
  projectId: string;
  /** Eerste tracé voor link naar tracé-engineering */
  firstTraceId?: string | null;
  /** Optionele status per stap (bijv. op basis van projectvoortgang) */
  stepStatuses?: Partial<Record<ProjectProcessStepId, StepperStatus>>;
  compact?: boolean;
  className?: string;
}

export function ProjectProcessNav({
  projectId,
  firstTraceId,
  stepStatuses,
  compact = false,
  className,
}: ProjectProcessNavProps) {
  const pathname = usePathname();
  const activeStep = resolveProjectProcessStep(pathname);
  const process = useProjectProcess();
  const traceLinkId = firstTraceId ?? process?.traceLinkId ?? null;

  const steps: StepperStep[] = PROJECT_PROCESS_STEPS.map((step) => {
    const href = getProjectProcessStepHref(
      step.id,
      projectId,
      step.id === 'trace' ? traceLinkId : undefined
    );
    const isCurrentPage =
      pathname === href || (step.id === 'trace' && pathname.includes('/trace/') && activeStep === 'trace');

    return {
      id: step.id,
      nummer: step.nummer,
      label: step.label,
      titel: step.titel,
      href: isCurrentPage ? undefined : href,
      status: stepStatuses?.[step.id],
    };
  });

  return (
    <ProcessStepper
      steps={steps}
      activeStepId={activeStep}
      compact={compact}
      className={className}
    />
  );
}

/** Korte beschrijving van de actieve projectstap */
export function ProjectProcessHint({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const activeStep = resolveProjectProcessStep(pathname);
  const def = PROJECT_PROCESS_STEPS.find((s) => s.id === activeStep);
  if (!def) return null;

  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{def.titel}:</span> {def.beschrijving}
    </p>
  );
}
