import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const BRAND_COLOR = '2D6FE8';

function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    runs.push(new TextRun({ text: match[1], bold: true }));
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

function headingParagraph(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel]
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 0 : 240, after: 120 },
    children: parseInlineRuns(text),
  });
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: parseInlineRuns(text),
  });
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: parseInlineRuns(text),
  });
}

function numberedParagraph(text: string, index: number): Paragraph {
  return new Paragraph({
    numbering: { reference: 'default-numbering', level: 0 },
    spacing: { after: 60 },
    children: parseInlineRuns(text),
  });
}

function tableFromMarkdown(tableLines: string[]): Table {
  const rows = tableLines.filter((l) => !l.includes('---'));
  const parse = (row: string) =>
    row
      .split('|')
      .filter(Boolean)
      .map((c) => c.trim());

  const [header, ...body] = rows;
  const headerCells = parse(header);

  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map(
      (cell) =>
        new TableCell({
          width: { size: 100 / headerCells.length, type: WidthType.PERCENTAGE },
          shading: { fill: 'F1F5F9' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: cell, bold: true, size: 20 })],
            }),
          ],
        })
    ),
  });

  const bodyRows = body.map(
    (row) =>
      new TableRow({
        children: parse(row).map(
          (cell) =>
            new TableCell({
              width: { size: 100 / headerCells.length, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: parseInlineRuns(cell) })],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

export function markdownToDocxChildren(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      children.push(headingParagraph(line.slice(2), HeadingLevel.HEADING_1));
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      children.push(headingParagraph(line.slice(3), HeadingLevel.HEADING_2));
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      children.push(headingParagraph(line.slice(4), HeadingLevel.HEADING_3));
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          indent: { left: 360 },
          border: { left: { color: BRAND_COLOR, size: 12, style: 'single' } },
          children: parseInlineRuns(quoteLines.join(' ')),
        })
      );
      continue;
    }
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      children.push(tableFromMarkdown(tableLines));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }
    if (line === '---') {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          border: { bottom: { color: 'E2E8F0', size: 6, style: 'single' } },
          children: [],
        })
      );
      i++;
      continue;
    }
    if (/^\d+\. /.test(line)) {
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const text = lines[i].replace(/^\d+\. /, '');
        children.push(numberedParagraph(text, 0));
        i++;
      }
      continue;
    }
    if (line.startsWith('- ')) {
      while (i < lines.length && lines[i].startsWith('- ')) {
        children.push(bulletParagraph(lines[i].slice(2)));
        i++;
      }
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    children.push(bodyParagraph(line));
    i++;
  }

  return children;
}

export async function markdownToDocxBlob(
  markdown: string,
  title: string
): Promise<Blob> {
  const meta = new Paragraph({
    spacing: { after: 360 },
    children: [
      new TextRun({
        text: `Infra Engine · ${new Date().toLocaleDateString('nl-NL')}`,
        size: 18,
        color: '64748B',
      }),
    ],
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 120 },
            children: [new TextRun({ text: title, bold: true, size: 32, color: '0F172A' })],
          }),
          meta,
          ...markdownToDocxChildren(markdown),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadMarkdownAsWord(
  markdown: string,
  filename: string,
  title: string
): Promise<void> {
  const blob = await markdownToDocxBlob(markdown, title);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
