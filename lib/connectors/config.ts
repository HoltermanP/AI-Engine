export interface ConnectorEnvConfig {
  pdokForceDemo: boolean;
  broForceDemo: boolean;
  waterschapForceDemo: boolean;
  /** Leeg = geen extra bronnen; 'all' = alle geregistreerde gemeentelijke bronnen */
  vervuildeGrondExtraSources: string[];
  openaiApiKey?: string;
  openaiModel: string;
  anthropicApiKey?: string;
  anthropicModel: string;
  klicUser?: string;
  klicApiToken?: string;
  klicPkiConfigured: boolean;
  brkUser?: string;
  brkPassword?: string;
}

export function getConnectorConfig(): ConnectorEnvConfig {
  return {
    // Standaard demo; zet *_FORCE_DEMO=false om live te activeren (fase 2+)
    pdokForceDemo: process.env.PDOK_FORCE_DEMO !== 'false',
    broForceDemo: process.env.BRO_FORCE_DEMO !== 'false',
    waterschapForceDemo: process.env.WATERSCHAP_FORCE_DEMO !== 'false',
    vervuildeGrondExtraSources: parseVervuildeGrondExtraSources(),
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001',
    klicUser: process.env.KLIC_USER,
    klicApiToken: process.env.KLIC_API_TOKEN,
    klicPkiConfigured: !!process.env.KLIC_PKI_CERT_PATH,
    brkUser: process.env.BRK_INZAGE_USER,
    brkPassword: process.env.BRK_INZAGE_PASSWORD,
  };
}

function parseVervuildeGrondExtraSources(): string[] {
  const raw = process.env.VERVUILDE_GROND_EXTRA_SOURCES?.trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'false' || raw === '0') return [];
  if (raw === 'all' || raw === 'true' || raw === '1') return ['all'];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Actieve gemeentelijke/extra bron-ids; standaard 'all' wanneer BRO live is. */
export function getEnabledVervuildeGrondExtraSourceIds(): string[] {
  const config = getConnectorConfig();
  if (config.vervuildeGrondExtraSources.length > 0) {
    return config.vervuildeGrondExtraSources;
  }
  if (!config.broForceDemo) return ['all'];
  return [];
}

export function maskSecret(value?: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(12, value.length - 4))}`;
}

/** Veilig te tonen overzicht van geladen omgevingsvariabelen (server-side). */
export function getEnvStatus() {
  const config = getConnectorConfig();
  const databaseUrl = process.env.DATABASE_URL;
  const mapillaryToken =
    process.env.MAPILLARY_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPILLARY_ACCESS_TOKEN;

  return {
    envFile: '.env.local',
    databaseConfigured:
      !!databaseUrl && !databaseUrl.includes('placeholder'),
    databaseHost: databaseUrl?.match(/@([^/]+)/)?.[1] ?? null,
    pdokMode: config.pdokForceDemo ? ('demo' as const) : ('live' as const),
    broMode: config.broForceDemo ? ('demo' as const) : ('live' as const),
    vervuildeGrondExtraSources: getEnabledVervuildeGrondExtraSourceIds(),
    waterschapMode: config.waterschapForceDemo ? ('demo' as const) : ('live' as const),
    openaiConfigured: !!config.openaiApiKey,
    openaiModel: config.openaiModel,
    anthropicConfigured:
      !!config.anthropicApiKey && !config.anthropicApiKey.includes('placeholder'),
    anthropicModel: config.anthropicModel,
    klicConfigured: !!(config.klicUser && config.klicApiToken && config.klicPkiConfigured),
    brkInzageConfigured: !!(config.brkUser && config.brkPassword),
    mapillaryConfigured: !!mapillaryToken,
    qstashConfigured:
      !!process.env.QSTASH_TOKEN && !process.env.QSTASH_TOKEN.includes('placeholder'),
    clerkConfigured:
      !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      !!process.env.CLERK_SECRET_KEY &&
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
}
