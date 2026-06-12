/**
 * GEF-CPT-parser (NEN-EN-ISO 22476-1 / GEF-CPT-Report): leest sondeerdata
 * (diepte + conusweerstand) uit een GEF-bestand en zet die om naar het
 * DemoSondering-model met grondlagen geclassificeerd op qc.
 *
 * Ondersteunt de gangbare velden: #XYID (RD-coördinaten), #ZID (maaiveld NAP),
 * #TESTID, #COLUMNINFO (kwantiteitsnummers 1 = sondeerlengte, 2 = qc),
 * #COLUMNSEPARATOR en #EOF/#EOH-datablok.
 */

import type { DemoSondering } from '@/demo/bro';

export interface GefParseResultaat {
  sondering: DemoSondering;
  maaiveldNap?: number;
  waarschuwingen: string[];
}

/** Grondsoort-indicatie uit conusweerstand (NEN 9997-1-benadering). */
export function grondsoortUitQc(qcMPa: number): string {
  if (qcMPa < 1) return 'veen';
  if (qcMPa < 3) return 'klei';
  return 'zand';
}

function headerWaarde(regels: string[], sleutel: string): string | null {
  const regel = regels.find((r) => r.trimStart().toUpperCase().startsWith(`#${sleutel}`));
  if (!regel) return null;
  const idx = regel.indexOf('=');
  return idx >= 0 ? regel.slice(idx + 1).trim() : null;
}

export function parseGef(inhoud: string, fallbackId = 'gef-upload'): GefParseResultaat {
  const waarschuwingen: string[] = [];
  const regels = inhoud.split(/\r?\n/);
  const eohIdx = regels.findIndex((r) => r.trimStart().toUpperCase().startsWith('#EOH'));
  const header = eohIdx >= 0 ? regels.slice(0, eohIdx) : regels;
  const dataRegels = eohIdx >= 0 ? regels.slice(eohIdx + 1) : [];

  // Identificatie + positie
  const testId = headerWaarde(header, 'TESTID') ?? fallbackId;
  const xyid = headerWaarde(header, 'XYID');
  let x = 0;
  let y = 0;
  if (xyid) {
    const delen = xyid.split(',').map((d) => Number(d.trim()));
    // [stelsel, x, y, (precisie…)] — stelsel 31000 = RD
    if (delen.length >= 3 && Number.isFinite(delen[1]) && Number.isFinite(delen[2])) {
      x = delen[1];
      y = delen[2];
    }
  }
  if (!x || !y) waarschuwingen.push('Geen RD-coördinaten (#XYID) gevonden — positie op 0,0.');

  const zid = headerWaarde(header, 'ZID');
  const maaiveldNap = zid ? Number(zid.split(',')[1]?.trim()) : undefined;

  // Kolommen: kwantiteit 1 = sondeerlengte (m), 2 = qc (MPa)
  let dieptekolom = 0;
  let qcKolom = 1;
  for (const regel of header) {
    const r = regel.trimStart().toUpperCase();
    if (!r.startsWith('#COLUMNINFO')) continue;
    const delen = regel.slice(regel.indexOf('=') + 1).split(',').map((d) => d.trim());
    const kolomIdx = Number(delen[0]) - 1;
    const kwantiteit = Number(delen[3]);
    if (kwantiteit === 1) dieptekolom = kolomIdx;
    if (kwantiteit === 2) qcKolom = kolomIdx;
  }

  const separator = headerWaarde(header, 'COLUMNSEPARATOR');

  // Datablok → (diepte, qc)-paren
  const metingen: { diepte: number; qc: number }[] = [];
  for (const regel of dataRegels) {
    const schoon = regel.trim();
    if (!schoon || schoon.startsWith('#')) continue;
    const velden = separator
      ? schoon.split(separator).map((v) => v.trim())
      : schoon.split(/[\s;]+/);
    const diepte = Number(velden[dieptekolom]);
    const qc = Number(velden[qcKolom]);
    // GEF gebruikt vaak -9999.99 e.d. als "geen waarde"
    if (!Number.isFinite(diepte) || !Number.isFinite(qc) || qc < -100 || diepte < 0) continue;
    metingen.push({ diepte, qc: Math.max(0, qc) });
  }

  if (metingen.length === 0) {
    throw new Error('Geen bruikbare metingen in het GEF-bestand (diepte + qc niet gevonden).');
  }
  metingen.sort((a, b) => a.diepte - b.diepte);

  // Lagen: aaneengesloten trajecten met dezelfde grondsoort-indicatie
  const lagen: DemoSondering['lagen'] = [];
  let huidige: { van: number; grondsoort: string; qcSom: number; n: number } | null = null;
  for (const m of metingen) {
    const soort = grondsoortUitQc(m.qc);
    if (!huidige) {
      huidige = { van: 0, grondsoort: soort, qcSom: m.qc, n: 1 };
      continue;
    }
    if (soort === huidige.grondsoort) {
      huidige.qcSom += m.qc;
      huidige.n += 1;
    } else {
      lagen.push({
        van: huidige.van,
        tot: m.diepte,
        grondsoort: huidige.grondsoort,
        qc: Math.round((huidige.qcSom / huidige.n) * 10) / 10,
      });
      huidige = { van: m.diepte, grondsoort: soort, qcSom: m.qc, n: 1 };
    }
  }
  const maxDiepte = metingen[metingen.length - 1].diepte;
  if (huidige) {
    lagen.push({
      van: huidige.van,
      tot: maxDiepte,
      grondsoort: huidige.grondsoort,
      qc: Math.round((huidige.qcSom / huidige.n) * 10) / 10,
    });
  }
  // Heel dunne tussenlaagjes (< 0,3 m) opruimen door samen te voegen
  const opgeschoond = lagen.filter((l, i) => l.tot - l.van >= 0.3 || i === lagen.length - 1);

  const dominante = [...opgeschoond].sort((a, b) => (b.tot - b.van) - (a.tot - a.van))[0];
  const gemQcDiep = metingen.filter((m) => m.diepte > maxDiepte * 0.5);
  const qcKarakteristiek =
    gemQcDiep.reduce((s, m) => s + m.qc, 0) / Math.max(gemQcDiep.length, 1);

  return {
    sondering: {
      id: testId.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase() || fallbackId,
      x,
      y,
      diepte: Math.round(maxDiepte * 10) / 10,
      qc: Math.round(qcKarakteristiek * 10) / 10,
      grondsoort: dominante?.grondsoort ?? 'zand',
      lagen: opgeschoond,
    },
    maaiveldNap: Number.isFinite(maaiveldNap) ? maaiveldNap : undefined,
    waarschuwingen,
  };
}
