/**
 * Integratietest: de volledige netontwerp-flow zoals een netarchitect die
 * doorloopt — belastingen → kabeladvies → kabelkeuze → stationsadvies →
 * moffen/mantelbuizen → stationsontwerp → tekeningen.
 */

import { describe, expect, it } from 'vitest';
import {
  getNetontwerpAction,
  kabelAdviesAction,
  kiesKabelAction,
  suggestStationsAction,
  plaatsMoffenAction,
  genereerStationsontwerpenAction,
  genereerStationTekeningenAction,
  genereerWerktekeningenAction,
} from './netontwerp';

describe('netontwerp-flow (demo-project-001)', () => {
  it('doorloopt de hele ontwerpflow end-to-end', async () => {
    // Stap 1: seed-ontwerp met aansluitingen laden
    const ontwerp = await getNetontwerpAction('demo-project-001');
    expect(ontwerp.aansluitingen.length).toBeGreaterThan(0);
    expect(ontwerp.traceIds).toContain('trace-ls-001');

    // Stap 3: kabeladvies op basis van de belastingen
    const advies = await kabelAdviesAction(ontwerp, 'trace-ls-001');
    expect(advies).not.toBeNull();
    expect(advies!.belastingKVA).toBeGreaterThan(100);
    expect(advies!.advies.advies.netvlak).toBe('LS');
    expect(advies!.berekeningen.length).toBeGreaterThanOrEqual(3);

    // Kabel vastleggen → netType van het tracé gaat mee
    let bijgewerkt = await kiesKabelAction(
      ontwerp,
      'trace-ls-001',
      advies!.advies.advies.id,
      'advies',
      advies!.advies.motivatie,
    );
    expect(bijgewerkt.kabelKeuzes).toHaveLength(1);

    // Stap 4: stationsadvies uit belastingclusters
    const stationsAdvies = await suggestStationsAction(bijgewerkt);
    expect(stationsAdvies.aantalStations).toBeGreaterThanOrEqual(1);
    expect(stationsAdvies.suggesties[0].trafoKVA).toBeGreaterThan(0);

    // Suggesties overnemen als assets
    bijgewerkt = {
      ...bijgewerkt,
      assets: stationsAdvies.suggesties.map((s, i) => ({
        id: `station-test-${i}`,
        type: 'station' as const,
        subtype: s.subtype,
        naam: `TS-${i + 1}`,
        positie: { binding: 'punt' as const, x: s.x, y: s.y },
        eigenschappen: {
          trafoKVA: s.trafoKVA,
          aansluitingIds: s.aansluitingIds.join(','),
        },
        bron: 'auto' as const,
        gekoppeldeTraceIds: bijgewerkt.traceIds,
      })),
    };

    // Stap 6a: moffen + mantelbuizen automatisch plaatsen
    bijgewerkt = await plaatsMoffenAction(bijgewerkt);
    const moffen = bijgewerkt.assets.filter((a) => a.type === 'mof');
    expect(moffen.length).toBeGreaterThanOrEqual(2); // minimaal eindmoffen
    // Tracé > 500 m + GPLK-koppeling → ook verbindings-/overgangsmoffen
    expect(moffen.some((m) => m.subtype === 'overgangsmof')).toBe(true);

    // Stap 5: stationsontwerpen + tekeningen
    bijgewerkt = await genereerStationsontwerpenAction(bijgewerkt);
    expect(bijgewerkt.stationsOntwerpen.length).toBeGreaterThanOrEqual(1);
    const so = bijgewerkt.stationsOntwerpen[0];
    expect(so.trafo.vermogenKVA).toBeGreaterThan(0);
    expect(so.lsGroepen.length).toBeGreaterThanOrEqual(1);

    const stationTekeningen = await genereerStationTekeningenAction(bijgewerkt);
    expect(stationTekeningen.length).toBe(bijgewerkt.stationsOntwerpen.length * 2);
    expect(stationTekeningen[0].svg).toContain('<svg');

    // Stap 6b: werktekening met moffen
    const werktekeningen = await genereerWerktekeningenAction(bijgewerkt);
    expect(werktekeningen.length).toBeGreaterThanOrEqual(1);
    expect(werktekeningen[0].svg).toContain('data-symbool="mof"');
  });
});
