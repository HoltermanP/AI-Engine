import { describe, expect, it } from 'vitest';
import { deriveDeliverableStatuses } from './deliverable-status';
import { PROJECT_FASEN, PROJECT_FASE_BY_ID, bepaalActieveFase } from './fasen';

describe('deriveDeliverableStatuses', () => {
  it('geeft geen records voor een project zonder tracés (alles ontbreekt)', () => {
    const records = deriveDeliverableStatuses([]);
    expect(records).toEqual([]);
    expect(bepaalActieveFase(records)).toBe('verkenning');
  });

  it('markeert bij een VO-tracé de verkenning als definitief en VO als concept', () => {
    const records = deriveDeliverableStatuses([{ fase: 'VO' }]);

    const verkenning = records.filter((r) => r.faseId === 'verkenning');
    expect(verkenning).toHaveLength(PROJECT_FASE_BY_ID.verkenning.deliverables.length);
    expect(verkenning.every((r) => r.status === 'definitief')).toBe(true);

    const vo = records.filter((r) => r.faseId === 'vo');
    expect(vo).toHaveLength(PROJECT_FASE_BY_ID.vo.deliverables.length);
    expect(vo.every((r) => r.status === 'concept')).toBe(true);

    // Latere fasen krijgen geen record (= ontbreekt).
    expect(records.some((r) => r.faseId === 'do')).toBe(false);
    expect(records.some((r) => r.faseId === 'uo')).toBe(false);
    expect(bepaalActieveFase(records)).toBe('vo');
  });

  it('gebruikt de verst gevorderde fase over alle tracés', () => {
    const records = deriveDeliverableStatuses([
      { fase: 'VO' },
      { fase: 'UO' },
      { fase: 'DO' },
    ]);

    for (const faseId of ['verkenning', 'vo', 'do'] as const) {
      const faseRecords = records.filter((r) => r.faseId === faseId);
      expect(faseRecords.length).toBe(PROJECT_FASE_BY_ID[faseId].deliverables.length);
      expect(faseRecords.every((r) => r.status === 'definitief')).toBe(true);
    }
    expect(
      records.filter((r) => r.faseId === 'uo').every((r) => r.status === 'concept')
    ).toBe(true);
    expect(records.some((r) => r.faseId === 'werkvoorbereiding')).toBe(false);
    expect(bepaalActieveFase(records)).toBe('uo');
  });

  it('zet bij as_built alle eerdere fasen op definitief en uitvoering op concept', () => {
    const records = deriveDeliverableStatuses([{ fase: 'as_built' }]);

    const eerdereFasen = PROJECT_FASEN.slice(0, -1);
    for (const fase of eerdereFasen) {
      const faseRecords = records.filter((r) => r.faseId === fase.id);
      expect(faseRecords).toHaveLength(fase.deliverables.length);
      expect(faseRecords.every((r) => r.status === 'definitief')).toBe(true);
    }
    expect(
      records.filter((r) => r.faseId === 'uitvoering').every((r) => r.status === 'concept')
    ).toBe(true);
  });

  it('valt bij een onbekende tracé-fase terug op verkenning als concept', () => {
    const records = deriveDeliverableStatuses([{ fase: 'onbekend' }]);
    expect(records.every((r) => r.faseId === 'verkenning' && r.status === 'concept')).toBe(
      true
    );
  });
});
