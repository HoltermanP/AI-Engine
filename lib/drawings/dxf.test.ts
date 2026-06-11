import { describe, expect, it, afterEach } from 'vitest';
import {
  DXF_LAGEN,
  generateLengthProfileDxf,
  generateTraceDxf,
  generateCrossSectionDxf,
  generateCrossingDetailDxf,
  generateBorePlanDxf,
  generateBoreProfileDxf,
  type LengteprofielDxfInput,
  type TraceDxfInput,
} from './dxf';
import { getConfiguredDwgConverter } from './dwg-converter';

const traceInput: TraceDxfInput = {
  naam: 'TR-001 MS-tracé',
  centerline: [
    [155000, 463000],
    [155100, 463050],
    [155250, 463125],
  ],
  bestaandNet: [
    {
      thema: 'gas',
      coordinaten: [
        [155020, 462980],
        [155220, 463080],
      ],
      label: 'Gas LD PE110',
    },
    {
      thema: 'water',
      coordinaten: [
        [155010, 463030],
        [155210, 463130],
      ],
    },
  ],
  kruisingen: [{ positie: [155110, 463055], label: 'K1 gas LD' }],
  wegen: [
    {
      coordinaten: [
        [154990, 463010],
        [155300, 463160],
      ],
      naam: 'Espelerlaan',
    },
  ],
};

describe('generateTraceDxf', () => {
  it('genereert een geldige DXF-structuur met SECTION en ENTITIES', () => {
    const dxf = generateTraceDxf(traceInput);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('EOF');
  });

  it('bevat de NLCS-laagnamen voor tracé, kruisingen, wegen en annotatie', () => {
    const dxf = generateTraceDxf(traceInput);
    expect(dxf).toContain('KR-NIEUW WERK-K_OS-MS');
    expect(dxf).toContain('KR-NIEUW WERK-KRUISING');
    expect(dxf).toContain('KR-NIEUW WERK-ANNOTATIE');
    expect(dxf).toContain('OB-BESTAAND-WEGEN');
  });

  it('maakt per gebruikt KLIC-thema een bestaand-net-laag aan', () => {
    const dxf = generateTraceDxf(traceInput);
    expect(dxf).toContain('KR-BESTAAND-K_GAS');
    expect(dxf).toContain('KR-BESTAAND-K_WATER');
    // Niet-gebruikte thema's krijgen geen laag
    expect(dxf).not.toContain('KR-BESTAAND-K_RIOOL');
  });

  it('schrijft de centerline als LWPOLYLINE met RD-vertexcoördinaten', () => {
    const dxf = generateTraceDxf(traceInput);
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('155000');
    expect(dxf).toContain('463000');
    expect(dxf).toContain('155250');
    expect(dxf).toContain('463125');
  });

  it('markeert kruisingen met een CIRCLE en labeltekst', () => {
    const dxf = generateTraceDxf(traceInput);
    expect(dxf).toContain('CIRCLE');
    expect(dxf).toContain('K1 gas LD');
  });

  it('bevat tracénaam en weglabels als TEXT-entiteiten', () => {
    const dxf = generateTraceDxf(traceInput);
    expect(dxf).toContain('TEXT');
    expect(dxf).toContain('TR-001 MS-tracé');
    expect(dxf).toContain('Espelerlaan');
    expect(dxf).toContain('Gas LD PE110');
  });
});

const profielInput: LengteprofielDxfInput = {
  naam: 'TR-001',
  maaiveld: [
    [0, 1.5],
    [100, 1.2],
    [250, 0.8],
  ],
  leidingAs: [
    [0, 0.3],
    [100, 0.1],
    [250, -0.4],
  ],
};

describe('generateLengthProfileDxf', () => {
  it('genereert een geldige DXF-structuur met SECTION en ENTITIES', () => {
    const dxf = generateLengthProfileDxf(profielInput);
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');
  });

  it('gebruikt aparte lagen voor maaiveld, leiding-as en annotatie', () => {
    const dxf = generateLengthProfileDxf(profielInput);
    expect(dxf).toContain(DXF_LAGEN.lpMaaiveld.naam);
    expect(dxf).toContain(DXF_LAGEN.lpLeidingAs.naam);
    expect(dxf).toContain(DXF_LAGEN.annotatie.naam);
  });

  it('past de verticale schaalfactor 10× toe op hoogtes', () => {
    const dxf = generateLengthProfileDxf(profielInput);
    // maaiveld [0, 1.5] → y = 15; leidingAs [250, -0.4] → y = -4
    expect(dxf).toContain('15');
    expect(dxf).toContain('-4');
    // chainage blijft ongeschaald
    expect(dxf).toContain('250');
  });

  it('plaatst chainagelabels per 100 m', () => {
    const dxf = generateLengthProfileDxf(profielInput);
    expect(dxf).toContain('0 m');
    expect(dxf).toContain('100 m');
    expect(dxf).toContain('200 m');
    expect(dxf).toContain('vert. 10×');
  });

  it('respecteert een afwijkende verticale schaalfactor', () => {
    const dxf = generateLengthProfileDxf({ ...profielInput, verticaleSchaal: 5 });
    expect(dxf).toContain('vert. 5×');
    // maaiveld [0, 1.5] → y = 7.5
    expect(dxf).toContain('7.5');
  });
});

describe('getConfiguredDwgConverter', () => {
  afterEach(() => {
    delete process.env.DWG_CONVERTER_URL;
  });

  it('retourneert null zonder DWG_CONVERTER_URL', () => {
    delete process.env.DWG_CONVERTER_URL;
    expect(getConfiguredDwgConverter()).toBeNull();
  });

  it('retourneert een converter wanneer DWG_CONVERTER_URL is gezet', () => {
    process.env.DWG_CONVERTER_URL = 'https://converter.example/dwg';
    const converter = getConfiguredDwgConverter();
    expect(converter).not.toBeNull();
    expect(typeof converter?.convert).toBe('function');
  });
});

describe('nieuwe DXF-varianten', () => {
  it('dwarsprofiel bevat AVOI-slots, wegas en NLCS-lagen', () => {
    const dxf = generateCrossSectionDxf({
      naam: 'TST-01',
      profielBreedteM: 20,
      slots: [
        { label: 'Elektra LS', offsetM: -1.8, diepteNap: -0.7 },
        { label: 'Water', offsetM: 2.2, diepteNap: -1.1 },
      ],
    });
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain(DXF_LAGEN.lpMaaiveld.naam);
    expect(dxf).toContain(DXF_LAGEN.traceNieuw.naam);
    expect(dxf).toContain('Wegas');
    expect(dxf).toContain('Elektra LS');
    expect(dxf).toContain('Dwarsprofiel TST-01');
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('CIRCLE');
  });

  it('kruisingsdetail bevat dekking-maatvoering en mantelbuis', () => {
    const dxf = generateCrossingDetailDxf({
      naam: 'Urkerweg',
      dekkingM: 1.2,
      diameterMm: 200,
      methodeLabel: 'Nanodrill',
    });
    expect(dxf).toContain('Dekking 1.20 m');
    expect(dxf).toContain('mantelbuis');
    expect(dxf).toContain('Nanodrill');
    expect(dxf).toContain('Maaiveld');
    expect(dxf).toContain(DXF_LAGEN.bestaandOverig.naam);
  });

  it('boorplan bevat start- en eindput met maatvoering', () => {
    const dxf = generateBorePlanDxf({
      naam: 'S1',
      centerline: [
        [180000, 524000],
        [180080, 524010],
      ],
      entryPut: { l: 4, b: 2.5 },
      exitPut: { l: 3, b: 2 },
    });
    expect(dxf).toContain('Startput 4.0×2.5 m');
    expect(dxf).toContain('Eindput 3.0×2.0 m');
    expect(dxf).toContain('Boorplan S1');
    expect(dxf).toContain(DXF_LAGEN.traceNieuw.naam);
  });

  it('boorprofiel bevat maaiveld, boorlijn en grondwater', () => {
    const dxf = generateBoreProfileDxf({
      naam: 'S1',
      maaiveld: [
        [0, 0],
        [80, 0],
      ],
      boorlijn: [
        [0, 0],
        [20, -5],
        [60, -5],
        [80, 0],
      ],
      grondwaterNap: -1.4,
    });
    expect(dxf).toContain('Boorprofiel S1');
    expect(dxf).toContain('Grondwater -1.40 m NAP');
    expect(dxf).toContain(DXF_LAGEN.lpLeidingAs.naam);
    expect(dxf).toContain(DXF_LAGEN.bestaandWater.naam);
  });
});
