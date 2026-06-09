'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/progress-bar';
import { DocumentDownloadButtons } from '@/components/document-download-buttons';
import { DocumentPreview } from '@/components/document-preview';
import { buttonVariants } from '@/components/ui/button';
import type { ProjectRapportage } from '@/lib/services/reporting-types';
import { generateProjectRapportMarkdown } from '@/lib/services/reporting-markdown';
import { SIGNAAL_STIJL } from '@/lib/services/action-signals';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, TrendingUp } from 'lucide-react';

interface ProjectRapportageViewProps {
  rapport: ProjectRapportage;
}

export function ProjectRapportageView({ rapport }: ProjectRapportageViewProps) {
  const markdown = generateProjectRapportMarkdown(rapport);
  const openActies = rapport.acties.filter((a) => a.status !== 'afgerond');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-end gap-2">
        <DocumentDownloadButtons
          markdown={markdown}
          title={`Projectrapportage — ${rapport.projectNaam}`}
          filename={`projectrapport_${rapport.projectnummer}`}
          size="default"
          pdfMeta={{
            subtitel: `${rapport.projectnummer} · ${rapport.opdrachtgever}`,
            gegenereerd: new Date().toLocaleString('nl-NL'),
          }}
        />
        <Link
          href={`/project/${rapport.projectId}`}
          className={buttonVariants({ variant: 'outline', size: 'default', className: 'bg-white/80' })}
        >
          Naar project
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="overflow-hidden border-[#2D6FE8]/15 bg-gradient-to-br from-[#2D6FE8]/8 via-white to-white stat-glow-blue">
          <CardContent className="p-4 text-center">
            <TrendingUp className="mx-auto mb-2 h-5 w-5 text-[#2D6FE8]" />
            <Badge variant="outline" className="mb-2">{rapport.status}</Badge>
            <p className="font-mono text-2xl font-bold">{rapport.voortgang}%</p>
            <p className="text-xs text-muted-foreground">Voortgang</p>
            <ProgressBar value={rapport.voortgang} className="mt-2" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-4 text-center">
            <FileText className="mx-auto mb-2 h-5 w-5 text-slate-500" />
            <p className="font-mono text-2xl font-bold">{rapport.traceCount}</p>
            <p className="text-xs text-muted-foreground">Tracés</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{rapport.totaleLengteKm} km</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-amber-500/15 bg-gradient-to-br from-amber-500/8 via-white to-white stat-glow-amber">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-amber-600" />
            <p className="font-mono text-2xl font-bold">{rapport.openActies}</p>
            <p className="text-xs text-muted-foreground">Open acties</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-red-500/15 bg-gradient-to-br from-red-500/8 via-white to-white stat-glow-red">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-red-600" />
            <p className="font-mono text-2xl font-bold text-red-600">{rapport.blokkerendeActies}</p>
            <p className="text-xs text-muted-foreground">Blokkerend</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{rapport.conflicten} conflicten</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="section-heading text-base">Open acties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {openActies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen open acties.</p>
          ) : (
            openActies.map((a) => {
              const stijl = SIGNAAL_STIJL[a.signaal];
              return (
                <Link
                  key={a.id}
                  href={
                    a.traceId
                      ? `/project/${rapport.projectId}/trace/${a.traceId}`
                      : `/project/${rapport.projectId}`
                  }
                  className={cn(
                    'block rounded-xl border px-3 py-2.5 text-sm transition-all hover:border-[#2D6FE8]/40 hover:shadow-sm',
                    stijl.bg
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', stijl.dot)} />
                    <span className="font-medium">{a.titel}</span>
                  </div>
                  {a.deadline && (
                    <p className="mt-1 pl-4 text-[10px] text-muted-foreground">Deadline: {a.deadline}</p>
                  )}
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <DocumentPreview
        markdown={markdown}
        title={`Projectrapportage — ${rapport.projectNaam}`}
        subtitle={`${rapport.projectnummer} · ${rapport.opdrachtgever}`}
        showBrandHeader
        meta={[
          { label: 'Status', value: rapport.status },
          { label: 'Voortgang', value: `${rapport.voortgang}%` },
          { label: 'Tracés', value: String(rapport.traceCount) },
          { label: 'Datum', value: new Date().toLocaleDateString('nl-NL') },
        ]}
      />
    </div>
  );
}
