'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/progress-bar';
import { ClickableBar, ClickableStatCard } from '@/components/clickable-stat-card';
import type { PortfolioRapportage, ProjectRapportage } from '@/lib/services/reporting-types';
import { DocumentDownloadButtons } from '@/components/document-download-buttons';
import { DocumentPreview } from '@/components/document-preview';
import { generateMaandrapportMarkdown } from '@/lib/services/reporting-markdown';
import {
  actiesUrl,
  dashboardUrl,
  projectRapportageUrl,
  rapportageUrl,
  tracesUrl,
} from '@/lib/navigation/dashboard-links';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Lightbulb,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RapportageDashboardProps {
  portfolio: PortfolioRapportage;
  projectRapportages: ProjectRapportage[];
}

export function RapportageDashboard({ portfolio, projectRapportages }: RapportageDashboardProps) {
  const { kpis } = portfolio;
  const maandrapportMarkdown = generateMaandrapportMarkdown(portfolio);
  const gegenereerd = new Date(portfolio.gegenereerdOp).toLocaleString('nl-NL');

  const hoogste = [...portfolio.voortgangPerOpdrachtgever].sort((a, b) => b.voortgang - a.voortgang)[0];
  const risicoProjecten = projectRapportages.filter((p) => p.blokkerendeActies > 0);

  return (
    <div className="space-y-8">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ClickableStatCard href={dashboardUrl({ status: 'actief' })} ariaLabel="Actieve projecten">
          <Card className="relative h-full overflow-hidden border-[#2D6FE8]/15 bg-gradient-to-br from-[#2D6FE8]/8 via-white to-white stat-glow-blue">
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#2D6FE8]/10 blur-2xl" />
            <CardContent className="p-5">
              <BarChart3 className="mb-3 h-5 w-5 text-[#2D6FE8]" />
              <p className="font-mono text-4xl font-bold text-[#0D1428]">{kpis.actieveProjecten}</p>
              <p className="mt-1 text-sm font-medium text-foreground">Actieve projecten</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kpis.totaalProjecten} totaal in portfolio</p>
            </CardContent>
          </Card>
        </ClickableStatCard>
        <ClickableStatCard href={rapportageUrl()} ariaLabel="Voortgang portfolio">
          <Card className="relative h-full overflow-hidden border-emerald-500/15 bg-gradient-to-br from-emerald-500/8 via-white to-white stat-glow-emerald">
            <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
            <CardContent className="p-5">
              <TrendingUp className="mb-3 h-5 w-5 text-emerald-600" />
              <p className="font-mono text-4xl font-bold text-[#0D1428]">{kpis.gemiddeldeVoortgang}%</p>
              <p className="mt-1 text-sm font-medium text-foreground">Gemiddelde voortgang</p>
              <ProgressBar value={kpis.gemiddeldeVoortgang} className="mt-2" />
            </CardContent>
          </Card>
        </ClickableStatCard>
        <ClickableStatCard href={tracesUrl()} ariaLabel="Tracelengte portfolio">
          <Card className="relative h-full overflow-hidden border-slate-200/80 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-5">
              <Target className="mb-3 h-5 w-5 text-slate-500" />
              <p className="font-mono text-4xl font-bold text-[#0D1428]">{kpis.totaleTracelengteKm}</p>
              <p className="mt-1 text-sm font-medium text-foreground">km tracelengte</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{kpis.totaalTraces} tracés · {kpis.tracesKlaarVoorUitvoering} UO-gereed</p>
            </CardContent>
          </Card>
        </ClickableStatCard>
        <ClickableStatCard href={actiesUrl()} ariaLabel="Actiesignalen bekijken">
          <Card className="relative h-full overflow-hidden border-amber-500/15 bg-gradient-to-br from-amber-500/8 via-white to-white stat-glow-amber">
            <CardContent className="p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Actiesignalen</p>
              <div className="flex gap-4">
                <Link href={actiesUrl({ signaal: 'groen' })} className="text-center hover:opacity-80">
                  <p className="font-mono text-2xl font-bold text-emerald-600">{portfolio.actiesPerSignaal.groen}</p>
                  <p className="text-[10px] text-muted-foreground">Groen</p>
                </Link>
                <Link href={actiesUrl({ signaal: 'oranje' })} className="text-center hover:opacity-80">
                  <p className="font-mono text-2xl font-bold text-amber-600">{portfolio.actiesPerSignaal.oranje}</p>
                  <p className="text-[10px] text-muted-foreground">Oranje</p>
                </Link>
                <Link href={actiesUrl({ signaal: 'rood' })} className="text-center hover:opacity-80">
                  <p className="font-mono text-2xl font-bold text-red-600">{portfolio.actiesPerSignaal.rood}</p>
                  <p className="text-[10px] text-muted-foreground">Rood</p>
                </Link>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {kpis.openActies} open · {kpis.blokkerendeActies} blokkerend
              </p>
            </CardContent>
          </Card>
        </ClickableStatCard>
      </div>

      {/* Executive insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-500/20 bg-emerald-50/30">
          <CardContent className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Positief</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {kpis.tracesKlaarVoorUitvoering} tracés zijn gereed voor uitvoering. Hoogste voortgang bij{' '}
              <strong className="text-foreground">{hoogste?.opdrachtgever}</strong> ({hoogste?.voortgang}%).
              Het aantal afgeronde acties stijgt structureel.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-50/30">
          <CardContent className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Aandacht</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {kpis.blokkerendeActies} blokkerende acties en {kpis.blokkerendeConflicten} blokkerende conflicten.
              {risicoProjecten.length > 0
                ? ` Risicoprojecten: ${risicoProjecten.map((p) => p.projectNaam).join(', ')}.`
                : ' Geen acute escalaties.'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#2D6FE8]/20 bg-[#2D6FE8]/5">
          <CardContent className="p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#2D6FE8]/15">
              <Lightbulb className="h-5 w-5 text-[#2D6FE8]" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Kansen</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Digitalisering via Infra Engine verkort DO-doorlooptijd. Portfolio-synergie bij KLIC en HDD-technieken.
              Standaardisatie onderzoeksrapporten versnelt vergunningsaanvragen.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Maandtrend acties</CardTitle>
            <p className="text-xs text-muted-foreground">Ontwikkeling over de afgelopen 6 maanden</p>
          </CardHeader>
          <CardContent className="space-y-1">
            {portfolio.maandTrend.map((m) => {
              const totaal = m.afgerond + m.open + m.blokkerend;
              const pctAfgerond = totaal > 0 ? Math.round((m.afgerond / totaal) * 100) : 0;
              return (
                <ClickableBar key={m.maand} href={actiesUrl()} ariaLabel={`Acties in ${m.maand}`}>
                  <div className="space-y-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                      <span className="w-10 shrink-0 font-mono font-semibold uppercase text-foreground">
                        {m.maand}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-mono font-semibold">{m.afgerond}</span> afgerond
                        </span>
                        <span className="flex items-center gap-1 text-amber-700">
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="font-mono font-semibold">{m.open}</span> open
                        </span>
                        <span className={m.blokkerend > 0 ? 'flex items-center gap-1 text-red-600' : 'flex items-center gap-1 text-muted-foreground/60'}>
                          <span className={m.blokkerend > 0 ? 'h-2 w-2 rounded-full bg-red-500' : 'h-2 w-2 rounded-full bg-slate-300'} />
                          <span className="font-mono font-semibold">{m.blokkerend}</span> blokkerend
                        </span>
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold text-foreground">
                        {pctAfgerond}%
                      </span>
                    </div>
                    {/* Eén maatstaf per balk: aandeel afgeronde acties — zelfde schaal elke maand */}
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pctAfgerond}%` }}
                      />
                    </div>
                  </div>
                </ClickableBar>
              );
            })}
            <p className="border-t border-border pt-2.5 text-[10px] text-muted-foreground">
              Balk = aandeel afgeronde acties per maand. Aantallen per status staan ernaast.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Voortgang per opdrachtgever</CardTitle>
            <p className="text-xs text-muted-foreground">Gewogen gemiddelde per opdrachtgever</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {portfolio.voortgangPerOpdrachtgever.map((o) => (
              <ClickableBar
                key={o.opdrachtgever}
                href={dashboardUrl({ opdrachtgever: o.opdrachtgever })}
                ariaLabel={`Projecten van ${o.opdrachtgever}`}
              >
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{o.opdrachtgever}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{o.projecten} proj.</span>
                      <span className={cn(
                        'font-mono font-semibold',
                        o.voortgang >= 70 ? 'text-emerald-600' : o.voortgang >= 50 ? 'text-amber-600' : 'text-red-600'
                      )}>
                        {o.voortgang}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={o.voortgang} />
                </div>
              </ClickableBar>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Discipline breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Disciplineverdeling</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.disciplineVerdeling.map((d) => (
              <div key={d.discipline} className="rounded-lg border border-border bg-muted/20 p-4 text-center">
                <p className="font-mono text-2xl font-bold text-[#0D1428]">{d.count}</p>
                <p className="mt-1 text-xs font-medium text-foreground">{d.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {Math.round((d.count / Math.max(kpis.totaalTraces, 1)) * 100)}% van tracés
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Project cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-[#2D6FE8]" />
            Projectrapportages
          </CardTitle>
          <p className="text-xs text-muted-foreground">Klik voor het volledige projectrapport</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {projectRapportages.map((p) => (
              <Link
                key={p.projectId}
                href={projectRapportageUrl(p.projectId)}
                className="group rounded-xl border border-border p-4 transition-all hover:border-[#2D6FE8]/40 hover:bg-[#2D6FE8]/5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-[#2D6FE8]">
                      {p.projectNaam}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">{p.projectnummer}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{p.status}</Badge>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Voortgang</span>
                    <span className="font-mono font-medium">{p.voortgang}%</span>
                  </div>
                  <ProgressBar value={p.voortgang} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span>{p.traceCount} tracés</span>
                  <span>{p.totaleLengteKm} km</span>
                  <span>{p.openActies} open acties</span>
                  {p.blokkerendeActies > 0 && (
                    <span className="text-red-600">{p.blokkerendeActies} blokkerend</span>
                  )}
                </div>
                <p className="mt-3 flex items-center gap-1 text-[10px] font-medium text-[#2D6FE8] opacity-0 transition-opacity group-hover:opacity-100">
                  Bekijk rapport <ArrowRight className="h-3 w-3" />
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full maandrapport document */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-heading">
              Volledig maandrapport
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Uitgebreide toelichting met analyse, risico&apos;s en vooruitblik — {portfolio.periode}
            </p>
          </div>
        </div>
        <DocumentPreview
          markdown={maandrapportMarkdown}
          title={`Maandrapportage ${portfolio.periode}`}
          subtitle="Portfolio-overzicht ondergrondse infrastructuur — managementrapport voor stuuroverleg"
          showBrandHeader
          meta={[
            { label: 'Periode', value: portfolio.periode },
            { label: 'Projecten', value: String(kpis.actieveProjecten) },
            { label: 'Voortgang', value: `${kpis.gemiddeldeVoortgang}%` },
            { label: 'Gegenereerd', value: gegenereerd },
          ]}
        />
      </div>
    </div>
  );
}
