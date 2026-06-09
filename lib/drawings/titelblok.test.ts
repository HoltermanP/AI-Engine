import { describe, expect, it } from 'vitest';
import { renderTitelblokSvg, wrapDrawingWithTitelblok } from './titelblok';

const opts = {
  projectnaam: 'Netverzwaring Noordoostpolder',
  opdrachtgever: 'Netbeheer Noord BV',
  tekeningnummer: 'NOP01-DO-TEK-003-v1.2',
  schaal: '1:500',
  formaat: 'A3',
  status: 'in review' as const,
  versie: 'v1.2',
  datum: '9 juni 2026',
  getekendDoor: 'P. Holterman',
  gecontroleerdDoor: 'J. de Vries',
};

describe('renderTitelblokSvg', () => {
  it('retourneert een SVG-groep met alle velden', () => {
    const g = renderTitelblokSvg(opts);
    expect(g.startsWith('<g')).toBe(true);
    expect(g.trimEnd().endsWith('</g>')).toBe(true);
    expect(g).toContain('Netverzwaring Noordoostpolder');
    expect(g).toContain('Netbeheer Noord BV');
    expect(g).toContain('NOP01-DO-TEK-003-v1.2');
    expect(g).toContain('1:500');
    expect(g).toContain('A3');
    expect(g).toContain('in review');
    expect(g).toContain('v1.2');
    expect(g).toContain('9 juni 2026');
    expect(g).toContain('P. Holterman');
    expect(g).toContain('J. de Vries');
  });

  it('vermeldt de NLCS 5.0-norm uit lib/normen.ts', () => {
    expect(renderTitelblokSvg(opts)).toContain('NLCS 5.0');
  });

  it('gebruikt 180×120 als default kaderafmeting en is parametrisch', () => {
    const standaard = renderTitelblokSvg();
    expect(standaard).toContain('width="180"');
    expect(standaard).toContain('height="120"');
    const breed = renderTitelblokSvg({ breedte: 220, hoogte: 140 });
    expect(breed).toContain('width="220"');
    expect(breed).toContain('height="140"');
  });

  it('escapet XML-bijzondere tekens in veldwaarden', () => {
    const g = renderTitelblokSvg({ projectnaam: 'A <&> "B"' });
    expect(g).toContain('A &lt;&amp;&gt; &quot;B&quot;');
    expect(g).not.toContain('A <&>');
  });
});

const basisSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#fff"/>
  <path d="M 10 10 L 100 100" stroke="#c80000"/>
</svg>`;

describe('wrapDrawingWithTitelblok', () => {
  it('behoudt de originele tekeninginhoud', () => {
    const result = wrapDrawingWithTitelblok(basisSvg, opts);
    expect(result).toContain('<path d="M 10 10 L 100 100" stroke="#c80000"/>');
    expect(result).toContain('<rect width="900" height="620" fill="#fff"/>');
  });

  it('vergroot de viewBox onderaan met titelblokstrook', () => {
    const result = wrapDrawingWithTitelblok(basisSvg, opts);
    // 620 + 120 (blok) + 2 × 8 (marge) = 756
    expect(result).toContain('viewBox="0 0 900 756"');
    expect(result).toContain('height="756"');
    expect(result).not.toContain('viewBox="0 0 900 620"');
  });

  it('voegt titelblok en kaderrand toe', () => {
    const result = wrapDrawingWithTitelblok(basisSvg, opts);
    expect(result).toContain('data-titelblok="nlcs"');
    expect(result).toContain('data-kaderrand="nlcs"');
    expect(result).toContain('NOP01-DO-TEK-003-v1.2');
    // Titelblok staat vóór de sluittag
    expect(result.indexOf('data-titelblok')).toBeLessThan(result.lastIndexOf('</svg>'));
  });

  it('retourneert kapotte SVG ongewijzigd', () => {
    const kapot = '<div>geen svg</div>';
    expect(wrapDrawingWithTitelblok(kapot, opts)).toBe(kapot);
    const zonderMaten = '<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>';
    expect(wrapDrawingWithTitelblok(zonderMaten, opts)).toBe(zonderMaten);
    const zonderSluittag = '<svg viewBox="0 0 100 100"><g/>';
    expect(wrapDrawingWithTitelblok(zonderSluittag, opts)).toBe(zonderSluittag);
  });

  it('valt terug op width/height als viewBox ontbreekt', () => {
    const zonderViewBox = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><g/></svg>';
    const result = wrapDrawingWithTitelblok(zonderViewBox, opts);
    // 300 + 120 + 16 = 436
    expect(result).toContain('viewBox="0 0 400 436"');
    expect(result).toContain('height="436"');
  });
});
