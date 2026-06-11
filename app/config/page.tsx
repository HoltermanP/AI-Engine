import { AppShell } from '@/components/app-shell';
import { ConfigPanel } from '@/components/config-panel';
import { NetbronnenPanel } from '@/components/netbronnen-panel';
import { TraceLeerPanel } from '@/components/trace-leer-panel';
import { PageContainer } from '@/components/page-container';
import { PageHero } from '@/components/page-hero';
import { getConnectorStatuses } from '@/lib/connectors/registry';
import { getEnvStatus } from '@/lib/connectors/config';
import { DEMO_USER } from '@/lib/auth';

export default function ConfigPage() {
  const connectors = getConnectorStatuses();
  const envStatus = getEnvStatus();
  const liveCount = connectors.filter((c) => c.mode === 'live').length;

  return (
    <AppShell userName={DEMO_USER.naam}>
      <PageContainer>
        <PageHero
          eyebrow="Integraties"
          title="Connectorconfiguratie"
          subtitle="Beheer databronnen en credentials veilig via omgevingsvariabelen — test connecties en schakel tussen demo- en live-modus."
          footer={
            <p className="text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-[#0D1428]">{liveCount}</span> live ·{' '}
              <span className="font-mono font-semibold text-[#0D1428]">{connectors.length - liveCount}</span>{' '}
              lokaal/demo
            </p>
          }
        />
        <ConfigPanel connectors={connectors} envStatus={envStatus} />
        <NetbronnenPanel />
        <TraceLeerPanel />
      </PageContainer>
    </AppShell>
  );
}
