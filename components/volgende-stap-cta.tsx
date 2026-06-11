import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  PROJECT_FASEN,
  bepaalActieveFase,
  type DeliverableStatusRecord,
} from '@/lib/process/fasen';

interface VolgendeStapCtaProps {
  records: DeliverableStatusRecord[];
  projectId: string;
  firstTraceId?: string | null;
}

/**
 * Eén duidelijke vervolgactie, afgeleid uit het standaard ontwerpproces:
 * de actieve fase en de eerste deliverable die daar nog niet definitief is.
 */
export function VolgendeStapCta({ records, projectId, firstTraceId }: VolgendeStapCtaProps) {
  const actieveFaseId = bepaalActieveFase(records);
  const fase = PROJECT_FASEN.find((f) => f.id === actieveFaseId);
  if (!fase) return null;

  const statusVan = (deliverableId: string) =>
    records.find((r) => r.faseId === fase.id && r.deliverableId === deliverableId)?.status ??
    'ontbreekt';

  const volgende =
    fase.deliverables.find((d) => statusVan(d.id) === 'ontbreekt') ??
    fase.deliverables.find((d) => statusVan(d.id) !== 'definitief');

  if (!volgende) return null;

  // Waar werk je hieraan: ontwerpwerk in de tracé-werkruimte, planning bij PLN,
  // documenten en calculaties in het dossier.
  const href =
    volgende.docType === 'TEK' || volgende.docType === 'BER'
      ? firstTraceId
        ? `/project/${projectId}/trace/${firstTraceId}`
        : `/project/${projectId}`
      : volgende.docType === 'PLN'
        ? `/project/${projectId}/planning`
        : firstTraceId
          ? `/project/${projectId}/trace/${firstTraceId}?fase=output`
          : `/project/${projectId}/dossier`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2D6FE8]/25 bg-[#2D6FE8]/[0.06] px-3 py-2">
      <p className="min-w-0 text-xs text-foreground">
        <span className="font-semibold text-[#2D6FE8]">
          Nu aan de orde · {fase.kort}:
        </span>{' '}
        {volgende.naam}
      </p>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2D6FE8] px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#2563d4]"
      >
        Ga verder
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
