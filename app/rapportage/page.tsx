import { AppShell } from '@/components/app-shell';
import { DocumentDownloadButtons } from '@/components/document-download-buttons';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { RapportageDashboard } from '@/components/rapportage-dashboard';
import { Badge } from '@/components/ui/badge';
import { DEMO_USER } from '@/lib/auth';
import { generateMaandrapportMarkdown, getPortfolioRapportage, getProjectRapportages } from '@/lib/services/reporting';

export default async function RapportagePage() {
  const portfolio = await getPortfolioRapportage();
  const projectRapportages = await getProjectRapportages();
  const { kpis } = portfolio;
  const maandrapportMarkdown = generateMaandrapportMarkdown(portfolio);
  const gegenereerd = new Date(portfolio.gegenereerdOp).toLocaleString('nl-NL');

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <PageHero
          variant="dark"
          eyebrow="Portfolio rapportage"
          title={`Maandrapportage ${portfolio.periode}`}
          subtitle={`Integraal overzicht van voortgang, acties en risico's over ${kpis.actieveProjecten} actieve projecten en ${kpis.totaalTraces} tracés (${kpis.totaleTracelengteKm} km). Gemiddelde voortgang: ${kpis.gemiddeldeVoortgang}%.`}
          actions={
            <DocumentDownloadButtons
              markdown={maandrapportMarkdown}
              title={`Maandrapportage — ${portfolio.periode}`}
              filename={`maandrapportage_${portfolio.periode.replace(/\s+/g, '_')}`}
              size="default"
              onDark
              pdfMeta={{
                subtitel: `Portfolio-overzicht · ${kpis.actieveProjecten} actieve projecten`,
                periode: portfolio.periode,
                gegenereerd,
              }}
            />
          }
          footer={
            <div className="flex flex-wrap gap-2">
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                {portfolio.actiesPerSignaal.groen} groen
              </Badge>
              <Badge className="border-amber-400/30 bg-amber-500/20 text-amber-100">
                {portfolio.actiesPerSignaal.oranje} oranje
              </Badge>
              <Badge className="border-red-400/30 bg-red-500/20 text-red-100">
                {portfolio.actiesPerSignaal.rood} rood
              </Badge>
            </div>
          }
        />
        <RapportageDashboard portfolio={portfolio} projectRapportages={projectRapportages} />
      </PageContainer>
    </AppShell>
  );
}
