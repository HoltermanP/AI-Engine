import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getTraces } from '@/lib/db/store';
import { bepaalStartgereedheid } from '@/lib/services/startgereedheid';
import { VERGUNNING_STATUS_LABELS } from '@/lib/db/vergunningen-store';
import { formatDocCode } from '@/lib/dossier/doc-code';
import { PrintKnop } from '@/components/print-knop';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle2, CircleAlert, ShieldCheck, TriangleAlert } from 'lucide-react';

interface StartbesluitPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, { tekst: string; klasse: string }> = {
  gereed: { tekst: 'Gereed', klasse: 'text-emerald-700' },
  aandacht: { tekst: 'Aandachtspunt', klasse: 'text-amber-700' },
  ontbreekt: { tekst: 'Ontbreekt', klasse: 'text-red-700' },
  nvt: { tekst: 'N.v.t.', klasse: 'text-slate-500' },
};

/**
 * Startbesluit — formeel go/no-go-document voor de start van de uitvoering,
 * opgesteld vanuit de startgereedheid-cockpit. Print-klaar (A4).
 */
export default async function StartbesluitPage({ params }: StartbesluitPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const traces = await getTraces(id);
  const resultaat = bepaalStartgereedheid(id);
  const datum = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const docCode = formatDocCode({
    projectCode: project.projectnummer,
    fase: 'werkvoorbereiding',
    type: 'NOT',
    volgnummer: 1,
    versie: { major: 1, minor: 0 },
  });
  const isGo = resultaat.verdict === 'GO';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
      {/* Werkbalk (niet in print) */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/project/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Terug naar projectoverzicht
        </Link>
        <PrintKnop />
      </div>

      {/* Document */}
      <div className="rounded-xl border border-border bg-white p-8 text-slate-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Briefhoofd */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <p className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight">
              Startbesluit uitvoering
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Go/no-go-beslisdocument werkvoorbereiding → uitvoering
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-mono font-semibold">{docCode}</p>
            <p className="mt-1">{datum}</p>
            <p>InfraEngine</p>
          </div>
        </div>

        {/* Projectgegevens */}
        <table className="mt-5 w-full text-sm">
          <tbody>
            {[
              ['Project', project.naam],
              ['Projectnummer', project.projectnummer],
              ['Opdrachtgever', project.opdrachtgever],
              ['Gebied', project.gebied],
              [
                'Omvang',
                `${traces.length} tracé(s): ${traces.map((t) => t.code).join(', ')}`,
              ],
            ].map(([label, waarde]) => (
              <tr key={label} className="border-b border-slate-200">
                <td className="w-44 py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </td>
                <td className="py-1.5">{waarde}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Besluit */}
        <div
          className={cn(
            'mt-6 flex items-center gap-3 rounded-lg border-2 p-4',
            isGo ? 'border-emerald-600 bg-emerald-50' : 'border-red-500 bg-red-50',
          )}
        >
          <ShieldCheck className={cn('h-8 w-8 shrink-0', isGo ? 'text-emerald-600' : 'text-red-500')} />
          <div>
            <p className={cn('text-lg font-bold', isGo ? 'text-emerald-800' : 'text-red-800')}>
              {isGo
                ? 'GO — de uitvoering kan starten'
                : resultaat.verdict === 'BIJNA'
                  ? 'NO-GO — bijna startgereed, zie openstaande punten'
                  : 'NO-GO — uitvoering kan nog niet starten'}
            </p>
            <p className="mt-0.5 text-sm text-slate-700">
              Startgereedheid {resultaat.pct}% · {resultaat.gereed} van {resultaat.totaalVereist}{' '}
              producten gereed · kritieke vergunningstermijn {resultaat.kritiekeVergunningWeken} weken
            </p>
          </div>
        </div>

        {/* Criteria */}
        <h2 className="mt-7 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          1. Beoordeelde werkvoorbereidingsproducten
        </h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-1.5 pr-2">Product</th>
              <th className="w-32 py-1.5 pr-2">Status</th>
              <th className="py-1.5">Toelichting</th>
            </tr>
          </thead>
          <tbody>
            {resultaat.criteria.map((c) => {
              const stijl = STATUS_LABEL[c.status];
              return (
                <tr key={c.id} className="border-b border-slate-200 align-top">
                  <td className="py-2 pr-2 font-medium">{c.titel}</td>
                  <td className={cn('py-2 pr-2 font-semibold', stijl.klasse)}>
                    <span className="inline-flex items-center gap-1">
                      {c.status === 'gereed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : c.status === 'aandacht' ? (
                        <TriangleAlert className="h-3.5 w-3.5" />
                      ) : (
                        <CircleAlert className="h-3.5 w-3.5" />
                      )}
                      {stijl.tekst}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-slate-600">{c.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Vergunningen */}
        {resultaat.vergunningen.length > 0 && (
          <>
            <h2 className="mt-7 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
              2. Vergunningen & meldingen
            </h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 pr-2">Vergunning</th>
                  <th className="py-1.5 pr-2">Bevoegd gezag</th>
                  <th className="w-24 py-1.5 pr-2">Termijn</th>
                  <th className="w-40 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {resultaat.vergunningen.map((v) => (
                  <tr key={v.id} className="border-b border-slate-200">
                    <td className="py-2 pr-2">{v.naam}</td>
                    <td className="py-2 pr-2 text-slate-600">{v.bevoegdGezag}</td>
                    <td className="py-2 pr-2 text-slate-600">{v.termijnWeken} wkn</td>
                    <td
                      className={cn(
                        'py-2 font-semibold',
                        v.status === 'verleend'
                          ? 'text-emerald-700'
                          : v.status === 'ingediend'
                            ? 'text-amber-700'
                            : 'text-red-700',
                      )}
                    >
                      {VERGUNNING_STATUS_LABELS[v.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Voorwaarden */}
        <h2 className="mt-7 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          {resultaat.vergunningen.length > 0 ? '3' : '2'}. Voorwaarden bij start
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>KLIC-graafmelding (WIBON) maximaal 20 werkdagen vóór aanvang; liggingsgegevens op het werk aanwezig.</li>
          <li>Zorgvuldig grondroeren conform CROW 500: proefsleuven bij kruisingen en parallelligging binnen de vrij te houden afstand.</li>
          <li>V&G-plan ontwerpfase overgedragen aan de uitvoerende partij; V&G-plan uitvoeringsfase door aannemer.</li>
          <li>Wijzigingen ten opzichte van de werktekeningen via het afwijkingenproces; as-built-registratie bijhouden.</li>
        </ul>

        {/* Ondertekening */}
        <h2 className="mt-7 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wide">
          Ondertekening
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-6">
          {['Projectleider engineering', 'Opdrachtgever / netbeheerder', 'Uitvoerende aannemer'].map(
            (rol) => (
              <div key={rol} className="text-xs text-slate-600">
                <div className="h-16 rounded-md border border-dashed border-slate-300" />
                <p className="mt-1 font-medium text-slate-800">{rol}</p>
                <p>Naam / datum / handtekening</p>
              </div>
            ),
          )}
        </div>

        <p className="mt-6 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          Automatisch samengesteld door InfraEngine op {datum} op basis van de actuele dossier- en
          processtatus · {docCode} · status: {isGo ? 'definitief voorstel' : 'concept (niet startgereed)'}
        </p>
      </div>
    </div>
  );
}
