'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SourceBadge } from '@/components/source-badge';
import type { ConnectorStatus } from '@/lib/connectors/types';
import type { getEnvStatus } from '@/lib/connectors/config';
import { testConnectorAction } from '@/lib/actions/connectors';
import { CheckCircle2, XCircle, Loader2, KeyRound, Info } from 'lucide-react';

type EnvStatus = ReturnType<typeof getEnvStatus>;

interface ConfigPanelProps {
  connectors: ConnectorStatus[];
  envStatus: EnvStatus;
}

function EnvRow({ label, value, active }: { label: string; value: string; active?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={active ? 'text-green-700' : 'text-foreground'}>{value}</span>
    </div>
  );
}

export function ConfigPanel({ connectors, envStatus }: ConfigPanelProps) {
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  async function handleTest(id: string) {
    setTesting(id);
    const result = await testConnectorAction(id);
    setTestResults((prev) => ({ ...prev, [id]: result }));
    setTesting(null);
  }

  const liveCount = connectors.filter((c) => c.mode === 'live').length;
  const lokaalCount = connectors.filter((c) => c.mode === 'demo').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-[#2D6FE8]/50 bg-[#2D6FE8]/5 text-[#2D6FE8]">
          {liveCount} LIVE
        </Badge>
        <Badge variant="outline" className="border-slate-300/50 bg-slate-50 text-slate-600">
          {lokaalCount} Lokaal
        </Badge>
      </div>

      <Card className="overflow-hidden border-[#2D6FE8]/15 bg-gradient-to-br from-[#2D6FE8]/5 to-white">
        <CardHeader>
          <CardTitle className="text-base">Omgevingsvariabelen</CardTitle>
          <CardDescription>
            Configureer credentials in <code className="font-mono text-xs">.env.local</code>. Opgeslagen waarden worden nooit volledig getoond.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-foreground divide-y divide-border/60">
          <div className="pb-3 space-y-0.5">
            <p className="mb-2 flex items-center gap-1.5 font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {envStatus.envFile} geladen
            </p>
            <EnvRow
              label="DATABASE_URL"
              value={envStatus.databaseConfigured ? envStatus.databaseHost ?? 'geconfigureerd' : 'niet ingesteld'}
              active={envStatus.databaseConfigured}
            />
            <EnvRow label="PDOK" value={envStatus.pdokMode} active={envStatus.pdokMode === 'live'} />
            <EnvRow label="BRO" value={envStatus.broMode} active={envStatus.broMode === 'live'} />
            <EnvRow
              label="Bodemregisters"
              value={
                envStatus.vervuildeGrondExtraSources.length === 0
                  ? 'uit'
                  : envStatus.vervuildeGrondExtraSources.join(', ')
              }
              active={envStatus.vervuildeGrondExtraSources.length > 0}
            />
            <EnvRow label="Waterschap" value={envStatus.waterschapMode} />
            <EnvRow label="OpenAI" value={envStatus.openaiConfigured ? envStatus.openaiModel : 'niet ingesteld'} active={envStatus.openaiConfigured} />
            <EnvRow
              label="Anthropic"
              value={envStatus.anthropicConfigured ? envStatus.anthropicModel : 'niet ingesteld'}
              active={envStatus.anthropicConfigured}
            />
            <EnvRow label="KLIC" value={envStatus.klicConfigured ? 'geconfigureerd' : 'niet ingesteld'} active={envStatus.klicConfigured} />
            <EnvRow label="BRK Inzage" value={envStatus.brkInzageConfigured ? 'geconfigureerd' : 'niet ingesteld'} active={envStatus.brkInzageConfigured} />
            <EnvRow label="Mapillary" value={envStatus.mapillaryConfigured ? 'geconfigureerd' : 'demo-token'} active={envStatus.mapillaryConfigured} />
            <EnvRow label="QStash" value={envStatus.qstashConfigured ? 'actief' : 'sync modus'} active={envStatus.qstashConfigured} />
          </div>
          <p className="pt-3 font-mono text-muted-foreground">
            Wijzig waarden in .env.local en herstart de dev-server (npm run dev).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {connectors.map((connector) => {
          const testResult = testResults[connector.id];
          return (
            <Card key={connector.id} className="surface-card overflow-hidden transition-all hover:border-[#2D6FE8]/20">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">
                        {connector.label}
                      </CardTitle>
                      <SourceBadge source={connector.mode} />
                      {connector.requiresKey && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          <KeyRound className="mr-1 h-3 w-3" />
                          Key vereist
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 font-mono text-xs">
                      {connector.id}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest(connector.id)}
                    disabled={testing === connector.id}
                  >
                    {testing === connector.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Test verbinding'
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {connector.note && (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    {connector.note}
                  </p>
                )}
                {testResult && (
                  <p
                    className={`flex items-center gap-1.5 text-xs ${
                      testResult.ok ? 'text-green-700' : 'text-[#FF4D1C]'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {testResult.message}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
