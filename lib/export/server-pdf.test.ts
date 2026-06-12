import { describe, expect, it } from 'vitest';
import { markdownNaarPdf, svgNaarPdf } from './server-pdf';

describe('markdownNaarPdf', () => {
  it('rendert koppen, lijsten en tabellen naar een geldige PDF', () => {
    const pdf = markdownNaarPdf(
      `# Hoofdstuk\n\nGewone alinea met **vet** en \`code\`.\n\n## Paragraaf\n\n- punt één\n- [x] afgevinkt\n\n| Kolom A | Kolom B |\n|---|---|\n| 1 | 2 |\n`,
      { titel: 'Testdocument' },
    );
    expect(pdf.length).toBeGreaterThan(1000);
    // PDF-magic bytes
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe('%PDF-');
  });

  it('pagineert lange documenten', () => {
    const lang = Array.from({ length: 300 }, (_, i) => `Regel ${i} met wat tekst erachter.`).join('\n');
    const pdf = markdownNaarPdf(lang);
    expect(pdf.length).toBeGreaterThan(5000);
  });
});

describe('svgNaarPdf', () => {
  it('rastert een tekening-SVG naar een A3-PDF', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" width="900" height="560">
      <rect width="900" height="560" fill="#fff"/>
      <path d="M 100 100 L 800 400" stroke="#960000" stroke-width="3" fill="none"/>
      <text x="450" y="50" font-size="14" text-anchor="middle">Werktekening test</text>
    </svg>`;
    const pdf = svgNaarPdf(svg, 'Werktekening test');
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(3000);
  });
});
