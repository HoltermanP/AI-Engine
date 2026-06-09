import type { BodemRisicoklasse } from '@/lib/services/bodem-risico/types';
import { RISICO_KLEUR } from '@/lib/services/bodem-risico/types';
import { VERVUILDE_GROND_EXTRA_SOURCES } from './registry';

/** Landelijke BRO-bronnen (SLD + SAD). */
export const BRO_VERVUILDE_GROND_LABELS: Record<string, string> = {
  sld_bodemlocatie: 'Bodemlocatie (SLD)',
  sld_aangepakt_gebied: 'Aangepakt gebied (SLD)',
  sld_nazorggebied: 'Nazorggebied (SLD)',
  sld_overheidsbesluit: 'Overheidsbesluit (SLD)',
  sld_verontreinigd_gebied: 'Verontreinigd gebied (SLD)',
  sad_bodemonderzoek: 'Bodemonderzoek (SAD)',
  sad_meetpunt: 'Meetpunt (SAD)',
};

export const BRO_VERVUILDE_GROND_KLEUREN: Record<string, string> = {
  sld_bodemlocatie: '#C0392B',
  sld_aangepakt_gebied: '#E67E22',
  sld_nazorggebied: '#8E44AD',
  sld_overheidsbesluit: '#922B21',
  sld_verontreinigd_gebied: '#A93226',
  sad_bodemonderzoek: '#D35400',
  sad_meetpunt: '#E67E22',
};

function extraBronMetadata(): { labels: Record<string, string>; kleuren: Record<string, string> } {
  const labels: Record<string, string> = {};
  const kleuren: Record<string, string> = {};
  for (const source of VERVUILDE_GROND_EXTRA_SOURCES) {
    for (const layer of source.layers) {
      labels[layer.bron] = layer.label;
      kleuren[layer.bron] = layer.color;
    }
  }
  return { labels, kleuren };
}

const extra = extraBronMetadata();

export const VERVUILDE_GROND_LABEL: Record<string, string> = {
  ...BRO_VERVUILDE_GROND_LABELS,
  ...extra.labels,
};

export const VERVUILDE_GROND_KLEUR: Record<string, string> = {
  ...BRO_VERVUILDE_GROND_KLEUREN,
  ...extra.kleuren,
};

export function vervuildeGrondLabel(bron: string): string {
  return VERVUILDE_GROND_LABEL[bron] ?? bron;
}

export function vervuildeGrondKleur(bron: string, risicoklasse?: string): string {
  if (risicoklasse && risicoklasse in RISICO_KLEUR) {
    return RISICO_KLEUR[risicoklasse as BodemRisicoklasse];
  }
  return VERVUILDE_GROND_KLEUR[bron] ?? '#C0392B';
}
