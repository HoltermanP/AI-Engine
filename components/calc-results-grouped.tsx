'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  groupCalculationsByCategorie,
  type CalcCategorie,
} from '@/lib/calc';
import {
  CALC_CATEGORIE_KLEUREN,
  CALC_CATEGORIE_LABELS,
  type CalcResult,
} from '@/lib/calc/types';
import { Zap, Flame, Droplets, Building2, Ruler } from 'lucide-react';

const CATEGORIE_ICON: Record<CalcCategorie, typeof Zap> = {
  elektra: Zap,
  gas: Flame,
  water: Droplets,
  stations: Building2,
  algemeen: Ruler,
};

const CATEGORIE_VOLGORDE: CalcCategorie[] = ['elektra', 'gas', 'water', 'stations', 'algemeen'];

interface CalcResultsGroupedProps {
  berekeningen: CalcResult[];
}

export function CalcResultsGrouped({ berekeningen }: CalcResultsGroupedProps) {
  const grouped = groupCalculationsByCategorie(berekeningen);

  if (berekeningen.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nog geen berekeningen. Klik op &quot;Bereken&quot; om discipline-specifieke resultaten te genereren.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {CATEGORIE_VOLGORDE.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const Icon = CATEGORIE_ICON[cat];
        const kleur = CALC_CATEGORIE_KLEUREN[cat];

        return (
          <div key={cat}>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: `${kleur}20`, color: kleur }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{CALC_CATEGORIE_LABELS[cat]}</h3>
              <Badge variant="outline" className="text-[10px]">
                {items.length} berekening{items.length !== 1 ? 'en' : ''}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((b) => (
                <Card key={b.type} className="border-l-4" style={{ borderLeftColor: kleur }}>
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm capitalize">{b.type.replace(/_/g, ' ')}</CardTitle>
                      <div className="flex items-center gap-2">
                        {'voldoet' in b.resultaat && (
                          <Badge
                            variant={b.resultaat.voldoet ? 'default' : 'destructive'}
                            className="text-[10px]"
                          >
                            {b.resultaat.voldoet ? 'Voldoet' : 'Voldoet niet'}
                          </Badge>
                        )}
                        {'thermischVoldoet' in b.resultaat && !('voldoet' in b.resultaat) && (
                          <Badge
                            variant={b.resultaat.thermischVoldoet ? 'default' : 'destructive'}
                            className="text-[10px]"
                          >
                            {b.resultaat.thermischVoldoet ? 'Voldoet' : 'Voldoet niet'}
                          </Badge>
                        )}
                        <span className="font-mono text-[10px] text-muted-foreground">{b.normReferentie}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-1 text-xs">
                    <p className="text-foreground">{b.conclusie}</p>
                    <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] text-muted-foreground">
                      {Object.entries(b.resultaat).map(([k, v]) => (
                        <span key={k} className="rounded bg-muted px-1.5 py-0.5">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
