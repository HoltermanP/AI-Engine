import { describe, expect, it } from 'vitest';
import { bepaalStartgereedheid } from './startgereedheid';
import { saveTekeningenToDossier, saveBerekeningenToDossier } from '@/lib/dossier/store';
import { zetDemoVergunningStatus } from '@/lib/db/vergunningen-store';

describe('startgereedheid (go/no-go start uitvoering)', () => {
  it('is NO_GO bij een leeg dossier en benoemt de ontbrekende producten', () => {
    const res = bepaalStartgereedheid('demo-project-002');
    expect(res.verdict).toBe('NO_GO');
    expect(res.pct).toBeLessThan(60);
    const ids = res.criteria.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining(['ontwerp', 'berekeningen', 'werktekeningen', 'vergunningen', 'vg', 'klic']),
    );
    // Elk niet-gereed criterium heeft een actie-link
    for (const c of res.criteria.filter((x) => x.status !== 'gereed')) {
      expect(c.actieHref, c.id).toBeTruthy();
    }
  });

  it('telt dossierproducten mee en verhoogt de gereedheid', () => {
    const voor = bepaalStartgereedheid('demo-project-003');
    saveBerekeningenToDossier('demo-project-003', 'trace-ls-003', 'EL-LS-003', [
      {
        type: 'spanningsval',
        discipline: 'elektra_ls',
        normReferentie: 'NEN 1010',
        invoer: {},
        resultaat: { voldoet: true },
        aannames: [],
        conclusie: 'ok',
      },
    ]);
    saveTekeningenToDossier('demo-project-003', 'trace-ls-003', [
      { type: 'werktekening', label: 'Werktekening EL-LS-003', svg: '<svg/>', formaat: 'svg' },
    ]);
    const na = bepaalStartgereedheid('demo-project-003');
    expect(na.pct).toBeGreaterThan(voor.pct);
    expect(na.criteria.find((c) => c.id === 'berekeningen')?.status).toBe('gereed');
    expect(na.criteria.find((c) => c.id === 'werktekeningen')?.status).toBe('gereed');
  });

  it('rapporteert de kritieke vergunningsdoorlooptijd', () => {
    const res = bepaalStartgereedheid('demo-project-001');
    expect(res.kritiekeVergunningWeken).toBeGreaterThanOrEqual(8);
  });

  it('neemt het netontwerp-criterium alleen op wanneer er een ontwerp is', () => {
    const met = bepaalStartgereedheid('demo-project-001'); // heeft seed-netontwerp
    expect(met.criteria.some((c) => c.id === 'netontwerp')).toBe(true);
  });

  it('zet het vergunningcriterium op gereed zodra alle vergunningen verleend zijn', () => {
    const voor = bepaalStartgereedheid('demo-project-004');
    const criterium = voor.criteria.find((c) => c.id === 'vergunningen')!;
    expect(criterium.status).not.toBe('gereed');
    expect(voor.vergunningen.length).toBeGreaterThan(0);

    // Eén vergunning indienen → aandacht of nog ontbreekt, maar niet gereed
    zetDemoVergunningStatus('demo-project-004', voor.vergunningen[0].id, 'ingediend');
    const tussen = bepaalStartgereedheid('demo-project-004');
    expect(tussen.criteria.find((c) => c.id === 'vergunningen')!.status).not.toBe('gereed');

    // Alles verlenen → gereed
    for (const v of voor.vergunningen) {
      zetDemoVergunningStatus('demo-project-004', v.id, 'verleend');
    }
    const na = bepaalStartgereedheid('demo-project-004');
    expect(na.criteria.find((c) => c.id === 'vergunningen')!.status).toBe('gereed');
    expect(na.pct).toBeGreaterThan(voor.pct);
  });
});
