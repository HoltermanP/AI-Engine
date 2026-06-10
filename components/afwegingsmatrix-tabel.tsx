'use client';

import type { Afwegingsmatrix } from '@/lib/services/afwegingsmatrix';
import { cn } from '@/lib/utils';

interface AfwegingsmatrixTabelProps {
  matrix: Afwegingsmatrix;
}

/** Kleurschaal voor scores 1–5 (5 = gunstig/groen, 1 = ongunstig/rood). */
function scoreKleur(score: number): string {
  if (score >= 4.5) return 'bg-emerald-600 text-white';
  if (score >= 3.5) return 'bg-emerald-500/80 text-white';
  if (score >= 2.5) return 'bg-amber-500/85 text-white';
  if (score >= 1.5) return 'bg-orange-500/85 text-white';
  return 'bg-red-600 text-white';
}

/**
 * Compacte afwegingsmatrix: rijen = criteria (label + gewicht), kolommen =
 * route-alternatieven, cellen = score 1–5 met kleurschaal. Onderaan de
 * gewogen totaalscore (0–100) en het advies met motivatie.
 */
export function AfwegingsmatrixTabel({ matrix }: AfwegingsmatrixTabelProps) {
  const adviesAlt = matrix.alternatieven.find((a) => a.alternatiefId === matrix.advies);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-2 py-1.5 text-left font-medium text-foreground">
                Criterium <span className="font-normal text-muted-foreground">(gewicht)</span>
              </th>
              {matrix.alternatieven.map((alt) => (
                <th
                  key={alt.alternatiefId}
                  className={cn(
                    'px-2 py-1.5 text-center font-medium',
                    alt.alternatiefId === matrix.advies ? 'text-[#2D6FE8]' : 'text-foreground'
                  )}
                >
                  {alt.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.criteria.map((criterium) => (
              <tr key={criterium.id} className="border-b border-border">
                <td className="px-2 py-1 text-foreground" title={criterium.toelichting}>
                  {criterium.label}{' '}
                  <span className="font-mono text-muted-foreground">({criterium.gewicht}%)</span>
                </td>
                {matrix.alternatieven.map((alt) => {
                  const score = alt.scores.find((s) => s.criterium === criterium.id);
                  return (
                    <td key={alt.alternatiefId} className="px-2 py-1 text-center">
                      {score ? (
                        <span
                          className={cn(
                            'inline-flex min-w-8 items-center justify-center rounded px-1 py-0.5 font-mono font-medium',
                            scoreKleur(score.score)
                          )}
                          title={`${score.motivatie} (${score.waardeLabel})`}
                        >
                          {score.score.toLocaleString('nl-NL')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-muted/40">
              <td className="px-2 py-1.5 font-semibold text-foreground">Totaalscore (0–100)</td>
              {matrix.alternatieven.map((alt) => (
                <td
                  key={alt.alternatiefId}
                  className={cn(
                    'px-2 py-1.5 text-center font-mono font-bold',
                    alt.alternatiefId === matrix.advies ? 'text-[#2D6FE8]' : 'text-foreground'
                  )}
                >
                  {alt.totaal.toLocaleString('nl-NL')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded border border-emerald-300 bg-emerald-50 p-2 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
          Advies{adviesAlt ? `: ${adviesAlt.label}` : ''}
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-700 dark:text-emerald-200">
          {matrix.adviesMotivatie}
        </p>
      </div>
    </div>
  );
}
