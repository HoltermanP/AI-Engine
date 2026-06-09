import ExcelJS from 'exceljs';
import type { CalculatieResult, ProjectCalculatieResult } from './types';
import { groepeerCalculatieRegels } from './engine';
import { BTW_PERCENTAGE } from '@/demo/calculatie-prijzen';

const KLEUR_HEADER = 'FF2D6FE8';
const KLEUR_GROEP = 'FFE8F0FE';
const KLEUR_TOTAAL = 'FF1A2332';
const KLEUR_WIT = 'FFFFFFFF';

const EURO_FMT = '€ #,##0.00';
const NUM_FMT = '#,##0.00';

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KLEUR_HEADER } };
    cell.font = { bold: true, color: { argb: KLEUR_WIT }, size: 10, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  row.height = 22;
}

function applyGroepStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KLEUR_GROEP } };
    cell.font = { bold: true, size: 10, name: 'Calibri' };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

function applyDataRow(row: ExcelJS.Row) {
  row.eachCell((cell, col) => {
    cell.font = { size: 10, name: 'Calibri' };
    cell.border = {
      top: { style: 'hair' },
      bottom: { style: 'hair' },
      left: { style: 'hair' },
      right: { style: 'hair' },
    };
    if (col >= 5 && col <= 7) cell.alignment = { horizontal: 'right' };
  });
}

function schrijfMeta(ws: ExcelJS.Worksheet, titel: string, meta: [string, string][]) {
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = titel;
  titleCell.font = { bold: true, size: 14, color: { argb: KLEUR_WIT }, name: 'Calibri' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KLEUR_TOTAAL } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 28;

  let row = 3;
  for (const [label, value] of meta) {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { bold: true, size: 10 };
    ws.mergeCells(`B${row}:G${row}`);
    ws.getCell(`B${row}`).value = value;
    ws.getCell(`B${row}`).font = { size: 10 };
    row++;
  }
  return row + 1;
}

function schrijfKolomkoppen(ws: ExcelJS.Worksheet, startRow: number) {
  const headers = ['Post', 'Omschrijving', 'Eenheid', 'Hoeveelheid', 'Eenheidsprijs', 'Totaal', 'Toelichting'];
  const row = ws.getRow(startRow);
  headers.forEach((h, i) => {
    row.getCell(i + 1).value = h;
  });
  applyHeaderStyle(row);
  return startRow + 1;
}

function schrijfCalculatieBlad(ws: ExcelJS.Worksheet, calc: CalculatieResult) {
  ws.columns = [
    { width: 12 },
    { width: 42 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 36 },
  ];

  const datum = new Date(calc.gegenereerdOp).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let row = schrijfMeta(ws, `Calculatie — ${calc.traceCode}`, [
    ['Project', `${calc.projectNaam} (${calc.projectnummer})`],
    ['Tracé', `${calc.traceCode} — ${calc.traceNaam}`],
    ['Discipline', calc.discipline],
    ['Tracélengte', `${calc.lengteM} m`],
    ['Datum', datum],
    ['Status', 'Concept — fictieve eenheidsprijzen'],
  ]);

  row = schrijfKolomkoppen(ws, row);

  for (const groep of calc.hoofdgroepen) {
    const groepRow = ws.getRow(row);
    ws.mergeCells(`A${row}:G${row}`);
    groepRow.getCell(1).value = `${groep.code} ${groep.naam}`;
    applyGroepStyle(groepRow);
    row++;

    for (const regel of groep.regels) {
      const dataRow = ws.getRow(row);
      dataRow.getCell(1).value = regel.postnummer;
      dataRow.getCell(2).value = regel.omschrijving;
      dataRow.getCell(3).value = regel.eenheid;
      dataRow.getCell(4).value = regel.hoeveelheid;
      dataRow.getCell(4).numFmt = NUM_FMT;
      dataRow.getCell(5).value = regel.eenheidsprijs;
      dataRow.getCell(5).numFmt = EURO_FMT;
      dataRow.getCell(6).value = regel.totaal;
      dataRow.getCell(6).numFmt = EURO_FMT;
      dataRow.getCell(7).value = regel.toelichting ?? '';
      applyDataRow(dataRow);
      row++;
    }

    const subRow = ws.getRow(row);
    ws.mergeCells(`A${row}:E${row}`);
    subRow.getCell(1).value = `Subtotaal ${groep.naam}`;
    subRow.getCell(1).font = { bold: true, italic: true, size: 10 };
    subRow.getCell(1).alignment = { horizontal: 'right' };
    subRow.getCell(6).value = groep.subtotaal;
    subRow.getCell(6).numFmt = EURO_FMT;
    subRow.getCell(6).font = { bold: true };
    row += 2;
  }

  const s = calc.samenvatting;
  const totaalRows: [string, number][] = [
    ['Subtotaal posten', s.subtotaal],
    [`Projectleiding`, s.projectleiding],
    [`Risicoregeling`, s.risicoregeling],
    ['Totaal excl. BTW', s.totaalExclBtw],
    [`BTW ${BTW_PERCENTAGE}%`, s.btw],
    ['Totaal incl. BTW', s.totaalInclBtw],
  ];

  for (const [label, bedrag] of totaalRows) {
    const tr = ws.getRow(row);
    ws.mergeCells(`A${row}:E${row}`);
    tr.getCell(1).value = label;
    tr.getCell(1).alignment = { horizontal: 'right' };
    tr.getCell(6).value = bedrag;
    tr.getCell(6).numFmt = EURO_FMT;
    const isFinal = label.startsWith('Totaal incl');
    tr.getCell(1).font = { bold: isFinal, size: isFinal ? 11 : 10 };
    tr.getCell(6).font = { bold: isFinal, size: isFinal ? 11 : 10 };
    if (isFinal) {
      tr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KLEUR_TOTAAL } };
      tr.getCell(1).font = { bold: true, color: { argb: KLEUR_WIT }, size: 11 };
      tr.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KLEUR_TOTAAL } };
      tr.getCell(6).font = { bold: true, color: { argb: KLEUR_WIT }, size: 11 };
    }
    row++;
  }

  ws.views = [{ state: 'frozen', ySplit: 9, activeCell: 'A10' }];
}

export async function generateCalculatieExcel(calc: CalculatieResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Infra Engine';
  wb.created = new Date();

  const ws = wb.addWorksheet('Calculatie', {
    properties: { defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  schrijfCalculatieBlad(ws, calc);

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateProjectCalculatieExcel(calc: ProjectCalculatieResult): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Infra Engine';
  wb.created = new Date();

  const samenvatting = wb.addWorksheet('Project totaal', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const pseudo: CalculatieResult = {
    traceId: calc.projectId,
    traceCode: calc.projectnummer,
    traceNaam: 'Alle tracés',
    projectId: calc.projectId,
    projectNaam: calc.projectNaam,
    projectnummer: calc.projectnummer,
    discipline: `${calc.traceCalculaties.length} tracés`,
    lengteM: calc.traceCalculaties.reduce((s, t) => s + t.lengteM, 0),
    gegenereerdOp: calc.gegenereerdOp,
    hoofdgroepen: groepeerCalculatieRegels(calc.regels),
    regels: calc.regels,
    samenvatting: calc.samenvatting,
  };

  schrijfCalculatieBlad(samenvatting, pseudo);

  for (const tc of calc.traceCalculaties) {
    const name = tc.traceCode.slice(0, 31);
    const ws = wb.addWorksheet(name, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });
    schrijfCalculatieBlad(ws, tc);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
