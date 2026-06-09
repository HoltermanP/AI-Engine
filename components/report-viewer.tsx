'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceBadge } from '@/components/source-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnderzoekReportDocument } from '@/components/onderzoek-report-document';
import type { OnderzoekDocument } from '@/lib/research/types';
import { Maximize2 } from 'lucide-react';

interface ReportViewerProps {
  rapporten: OnderzoekDocument[];
  savedTypes?: Set<string>;
  defaultActive?: string;
}

export function ReportViewer({
  rapporten,
  savedTypes,
  defaultActive,
}: ReportViewerProps) {
  const [selected, setSelected] = useState<OnderzoekDocument | null>(null);
  const [activeType, setActiveType] = useState<string | null>(
    defaultActive ?? rapporten[0]?.type ?? null
  );

  if (rapporten.length === 0) return null;

  const activeRapport = rapporten.find((r) => r.type === activeType) ?? rapporten[0];

  return (
    <>
      <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap gap-1 border-b border-border bg-card p-2">
          {rapporten.map((r) => (
            <button
              key={r.type}
              type="button"
              onClick={() => setActiveType(r.type)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                activeRapport.type === r.type
                  ? 'bg-[#2D6FE8] text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {r.titel}
              {savedTypes?.has(r.type) && (
                <span className="ml-1 text-[10px] opacity-80">✓</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          <OnderzoekReportDocument
            rapport={activeRapport}
            isSaved={savedTypes?.has(activeRapport.type)}
            compact
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 md:hidden">
        {rapporten.map((r) => (
          <Card key={r.type + r.titel}>
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{r.titel}</CardTitle>
                  <SourceBadge source={r._source} />
                  <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-700">
                    {r.status}
                  </Badge>
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(r)}>
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Open het rapport via de tabbladen hierboven.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
          {selected && (
            <OnderzoekReportDocument
              rapport={selected}
              isSaved={savedTypes?.has(selected.type)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
