import { describe, expect, it } from 'vitest';
import { grondsoortUitQc, parseGef } from './parse-gef';

const GEF_VOORBEELD = `#GEFID= 1, 1, 0
#FILEOWNER= InfraEngine
#TESTID= CPT-PUR-001
#XYID= 31000, 179850.0, 524700.0, 0.1, 0.1
#ZID= 31000, -0.20, 0.05
#COLUMN= 2
#COLUMNINFO= 1, m, Sondeerlengte, 1
#COLUMNINFO= 2, MPa, Conusweerstand, 2
#COLUMNSEPARATOR= ;
#EOH=
0.00; 0.40
0.50; 0.60
1.00; 0.80
1.50; 2.10
2.00; 2.40
2.50; 2.20
3.00; 8.50
4.00; 14.20
6.00; 18.70
10.00; 21.30
`;

describe('parseGef', () => {
  it('leest id, RD-positie en maaiveld uit de header', () => {
    const res = parseGef(GEF_VOORBEELD);
    expect(res.sondering.id).toBe('cpt-pur-001');
    expect(res.sondering.x).toBeCloseTo(179850.0, 1);
    expect(res.sondering.y).toBeCloseTo(524700.0, 1);
    expect(res.maaiveldNap).toBeCloseTo(-0.2, 2);
    expect(res.waarschuwingen).toHaveLength(0);
  });

  it('classificeert lagen op qc (veen < 1, klei 1-3, zand > 3)', () => {
    const res = parseGef(GEF_VOORBEELD);
    const soorten = res.sondering.lagen.map((l) => l.grondsoort);
    expect(soorten).toEqual(['veen', 'klei', 'zand']);
    expect(res.sondering.diepte).toBeCloseTo(10, 1);
    expect(res.sondering.grondsoort).toBe('zand'); // dominant (dikste laag)
  });

  it('parseert ook whitespace-gescheiden data zonder separator', () => {
    const zonderSep = GEF_VOORBEELD.replace('#COLUMNSEPARATOR= ;\n', '').replace(/;/g, ' ');
    const res = parseGef(zonderSep);
    expect(res.sondering.lagen.length).toBeGreaterThanOrEqual(2);
  });

  it('gooit een duidelijke fout bij een bestand zonder metingen', () => {
    expect(() => parseGef('#TESTID= leeg\n#EOH=\n')).toThrow(/Geen bruikbare metingen/);
  });

  it('grondsoortUitQc volgt de NEN 9997-1-benadering', () => {
    expect(grondsoortUitQc(0.5)).toBe('veen');
    expect(grondsoortUitQc(2)).toBe('klei');
    expect(grondsoortUitQc(15)).toBe('zand');
  });
});
