/**
 * Berekeningen-werkboek voor de uitvoeringsmap: alle vastgelegde
 * normberekeningen (CalcResult-JSON uit het dossier) in één Excel.
 */

import ExcelJS from 'exceljs';
import type { DossierItem } from '@/lib/dossier/store';

interface CalcJson {
  type?: string;
  discipline?: string;
  normReferentie?: string;
  invoer?: Record<string, unknown>;
  resultaat?: Record<string, unknown>;
  aannames?: string[];
  conclusie?: string;
}

function recordNaarTekst(record?: Record<string, unknown>): string {
  if (!record) return '';
  return Object.entries(record)
    .map(([k, v]) => `${k} = ${v}`)
    .join('\n');
}

export async function genereerBerekeningenExcel(items: DossierItem[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'InfraEngine';
  const sheet = workbook.addWorksheet('Berekeningen');

  sheet.columns = [
    { header: 'Document', key: 'naam', width: 34 },
    { header: 'Type', key: 'type', width: 20 },
    { header: 'Norm', key: 'norm', width: 26 },
    { header: 'Invoer', key: 'invoer', width: 40 },
    { header: 'Resultaat', key: 'resultaat', width: 40 },
    { header: 'Aannames', key: 'aannames', width: 44 },
    { header: 'Conclusie', key: 'conclusie', width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F0FE' },
  };

  for (const item of items) {
    let calc: CalcJson = {};
    try {
      calc = JSON.parse(item.inhoud) as CalcJson;
    } catch {
      calc = { conclusie: item.inhoud.slice(0, 500) };
    }
    const rij = sheet.addRow({
      naam: item.naam,
      type: calc.type ?? '',
      norm: calc.normReferentie ?? '',
      invoer: recordNaarTekst(calc.invoer),
      resultaat: recordNaarTekst(calc.resultaat),
      aannames: (calc.aannames ?? []).join('\n'),
      conclusie: calc.conclusie ?? '',
    });
    rij.alignment = { vertical: 'top', wrapText: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
