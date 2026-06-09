/**
 * Materiaallijst (BOM) voor werkvoorbereiding.
 *
 * Leidt uit het tracé de benodigde materialen af: kabel/buis per haspel of
 * streng inclusief snijverlies, moffen, mantelbuizen, zand/bedding,
 * markeringslint, afdekplaten en putten. Exporteerbaar naar Excel.
 */

import ExcelJS from 'exceljs';
import type { DemoTrace } from '@/demo/traces';
import { parseNetType } from '@/lib/calc/parse';
import { traceLengthM } from '@/lib/geo';

export interface MateriaalRegel {
  artikel: string;
  omschrijving: string;
  eenheid: 'm' | 'st' | 'm³' | 'rol';
  hoeveelheidNetto: number;
  /** Inclusief snijverlies/marge. */
  hoeveelheidBruto: number;
  toelichting?: string;
}

export interface MateriaalLijst {
  traceId: string;
  traceCode: string;
  traceNaam: string;
  discipline: string;
  lengteM: number;
  regels: MateriaalRegel[];
  aannames: string[];
}

/** Standaard haspellengte per discipline (m) — NL-praktijkwaarden. */
function haspelLengteM(discipline: DemoTrace['discipline']): number {
  if (discipline === 'elektra_ms') return 1000;
  if (discipline === 'elektra_ls') return 500;
  return 0; // buizen: per streng/lengte, niet per haspel
}

/** Snijverlies-/margefactor op lengtematerialen (5% + 5 m per uiteinde). */
const SNIJVERLIES_FACTOR = 1.05;
const UITEINDE_MARGE_M = 5;

function rond(n: number, dec = 1): number {
  const f = 10 ** dec;
  return Math.round(n * f) / f;
}

export function buildMateriaalLijst(trace: DemoTrace): MateriaalLijst {
  const lengteM =
    trace.segmenten.reduce((s, seg) => s + seg.lengteM, 0) ||
    traceLengthM(trace.coordinates, trace.traceLines);
  const parsed = parseNetType(trace.netType, trace.discipline);
  const diameterMm = parsed.diameterMm ?? 110;
  const isKabel = trace.discipline.startsWith('elektra');
  const regels: MateriaalRegel[] = [];
  const aannames: string[] = [
    'Hoeveelheden afgeleid uit tracégeometrie; verifiëren bij werkvoorbereiding.',
    `Snijverlies ${Math.round((SNIJVERLIES_FACTOR - 1) * 100)}% + ${UITEINDE_MARGE_M} m marge per uiteinde.`,
  ];

  const brutoLengte = lengteM * SNIJVERLIES_FACTOR + 2 * UITEINDE_MARGE_M;

  if (isKabel) {
    const haspel = haspelLengteM(trace.discipline);
    const aantalHaspels = Math.max(1, Math.ceil(brutoLengte / haspel));
    regels.push({
      artikel: trace.discipline === 'elektra_ms' ? 'KAB-MS' : 'KAB-LS',
      omschrijving: `Kabel ${trace.netType}`,
      eenheid: 'm',
      hoeveelheidNetto: rond(lengteM),
      hoeveelheidBruto: rond(aantalHaspels * haspel),
      toelichting: `${aantalHaspels} haspel(s) à ${haspel} m`,
    });
    // Moffen: per haspelovergang één verbindingsmof + 2 eindmoffen
    regels.push({
      artikel: trace.discipline === 'elektra_ms' ? 'MOF-MS' : 'MOF-LS',
      omschrijving: `Verbindingsmof ${trace.netType}`,
      eenheid: 'st',
      hoeveelheidNetto: Math.max(0, aantalHaspels - 1),
      hoeveelheidBruto: Math.max(0, aantalHaspels - 1),
      toelichting: 'Per haspelovergang',
    });
    regels.push({
      artikel: trace.discipline === 'elektra_ms' ? 'EIND-MS' : 'EIND-LS',
      omschrijving: 'Eindsluiting / aansluitmof',
      eenheid: 'st',
      hoeveelheidNetto: 2,
      hoeveelheidBruto: 2,
    });
  } else {
    const strengLengteM = 12; // standaard buislengte PE/PVC-streng
    regels.push({
      artikel: `BUIS-${diameterMm}`,
      omschrijving: `Buis Ø${diameterMm} mm ${trace.netType}`,
      eenheid: 'm',
      hoeveelheidNetto: rond(lengteM),
      hoeveelheidBruto: rond(Math.ceil(brutoLengte / strengLengteM) * strengLengteM),
      toelichting: `${Math.ceil(brutoLengte / strengLengteM)} strengen à ${strengLengteM} m`,
    });
    regels.push({
      artikel: `KOP-${diameterMm}`,
      omschrijving: 'Elektrolas-/steekmof',
      eenheid: 'st',
      hoeveelheidNetto: Math.ceil(brutoLengte / strengLengteM) - 1,
      hoeveelheidBruto: Math.ceil(brutoLengte / strengLengteM) - 1,
      toelichting: 'Per strengverbinding',
    });
  }

  // Mantelbuizen: per sleufloze passage (boring/persing)
  const boringen = trace.segmenten.filter((s) => s.legtechniek !== 'open_ontgraving');
  if (boringen.length > 0) {
    const mantelLengte = boringen.reduce((s, b) => s + b.lengteM, 0);
    const mantelD = Math.max(110, Math.ceil((diameterMm * 1.5) / 10) * 10);
    regels.push({
      artikel: `MANTEL-${mantelD}`,
      omschrijving: `Mantelbuis Ø${mantelD} mm (boringen/persingen)`,
      eenheid: 'm',
      hoeveelheidNetto: rond(mantelLengte),
      hoeveelheidBruto: rond(mantelLengte * SNIJVERLIES_FACTOR + boringen.length * 2 * 2),
      toelichting: `${boringen.length} passage(s); mantel ≥ 1,5× productdiameter`,
    });
    aannames.push('Mantelbuisdiameter 1,5× productdiameter (afgerond op 10 mm).');
  }

  // Zandbed: open-ontgravingsdelen — 0,1 m³/m per laag onder + boven (0.2 m³/m totaal indicatief)
  const openLengte = trace.segmenten
    .filter((s) => s.legtechniek === 'open_ontgraving')
    .reduce((s, seg) => s + seg.lengteM, 0) || (boringen.length === 0 ? lengteM : 0);
  if (openLengte > 0) {
    regels.push({
      artikel: 'ZAND-BED',
      omschrijving: 'Beddingszand (onder- en bovenvulling)',
      eenheid: 'm³',
      hoeveelheidNetto: rond(openLengte * 0.2, 1),
      hoeveelheidBruto: rond(openLengte * 0.2 * 1.1, 1),
      toelichting: '0,2 m³/m sleuf, 10% verdichtingsmarge',
    });
    regels.push({
      artikel: 'LINT',
      omschrijving: `Markeringslint "${isKabel ? 'elektriciteitskabel' : 'leiding'}"`,
      eenheid: 'rol',
      hoeveelheidNetto: Math.ceil(openLengte / 250),
      hoeveelheidBruto: Math.ceil(openLengte / 250),
      toelichting: 'Rollen à 250 m',
    });
    if (trace.discipline === 'elektra_ms' || trace.discipline === 'gas_hd') {
      regels.push({
        artikel: 'AFDEK',
        omschrijving: 'Afdekplaten/-tegels',
        eenheid: 'm',
        hoeveelheidNetto: rond(openLengte),
        hoeveelheidBruto: rond(openLengte * 1.02),
        toelichting: 'Mechanische bescherming MS/HD-tracé',
      });
    }
  }

  return {
    traceId: trace.id,
    traceCode: trace.code,
    traceNaam: trace.naam,
    discipline: trace.discipline,
    lengteM: rond(lengteM),
    regels,
    aannames,
  };
}

/** Excel-export van de materiaallijst (zelfde huisstijl als calculatie-export). */
export async function generateMateriaalExcel(lijsten: MateriaalLijst[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'InfraEngine';

  for (const lijst of lijsten) {
    const ws = wb.addWorksheet(lijst.traceCode.slice(0, 31));
    ws.columns = [
      { header: 'Artikel', key: 'artikel', width: 14 },
      { header: 'Omschrijving', key: 'omschrijving', width: 44 },
      { header: 'Eenheid', key: 'eenheid', width: 9 },
      { header: 'Netto', key: 'netto', width: 12 },
      { header: 'Bruto (incl. verlies)', key: 'bruto', width: 18 },
      { header: 'Toelichting', key: 'toelichting', width: 40 },
    ];
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D6FE8' } };
    });

    for (const regel of lijst.regels) {
      ws.addRow({
        artikel: regel.artikel,
        omschrijving: regel.omschrijving,
        eenheid: regel.eenheid,
        netto: regel.hoeveelheidNetto,
        bruto: regel.hoeveelheidBruto,
        toelichting: regel.toelichting ?? '',
      });
    }
    ws.addRow({});
    ws.addRow({ artikel: 'Aannames:' }).font = { bold: true };
    for (const aanname of lijst.aannames) {
      ws.addRow({ omschrijving: aanname });
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
