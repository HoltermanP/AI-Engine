import type { DemoTrace } from '@/demo/traces';
import type { TraceSegment } from '@/demo/roads';
import { parseNetType } from '@/lib/calc/parse';
import { traceLengthM } from '@/lib/geo';
import type { AfgeleidePost } from './types';

function lengtePerLegtechniek(trace: DemoTrace): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of trace.segmenten) {
    map[s.legtechniek] = (map[s.legtechniek] ?? 0) + s.lengteM;
  }
  if (!trace.segmenten.length) {
    map.open_ontgraving = traceLengthM(trace.coordinates, trace.traceLines);
  }
  return map;
}

function sleufBreedteM(discipline: DemoTrace['discipline']): number {
  if (discipline.startsWith('elektra_ms')) return 0.55;
  if (discipline.startsWith('gas_hd')) return 0.8;
  if (discipline === 'water') return 0.65;
  return 0.45;
}

function sleufDiepteM(trace: DemoTrace): number {
  const parsed = parseNetType(trace.netType, trace.discipline);
  const buisD = (parsed.diameterMm ?? 110) / 1000;
  return trace.vereisteDekking + buisD + 0.15;
}

function materiaalPostnummer(trace: DemoTrace): string {
  const d = trace.discipline;
  if (d === 'elektra_ls') return '03.01.010';
  if (d === 'elektra_ms') return '03.01.020';
  if (d === 'gas_ld') return '03.02.010';
  if (d === 'gas_hd') return '03.02.020';
  if (d === 'water') return '03.03.010';
  return '03.01.010';
}

function herstelPerSegment(seg: TraceSegment): AfgeleidePost[] {
  const posts: AfgeleidePost[] = [];
  const breedte = seg.leglocatie === 'onder_verharding' ? 0.6 : 0.4;

  if (seg.leglocatie === 'onder_verharding') {
    posts.push({
      postnummer: '06.01.010',
      hoeveelheid: Math.round(seg.lengteM * breedte * 10) / 10,
      toelichting: `${seg.wegnaam} — asfalt`,
    });
  } else if (seg.leglocatie === 'berm' || seg.leglocatie === 'parallelweg') {
    posts.push({
      postnummer: '06.03.010',
      hoeveelheid: seg.lengteM,
      toelichting: seg.wegnaam,
    });
  } else {
    posts.push({
      postnummer: '06.02.010',
      hoeveelheid: Math.round(seg.lengteM * breedte * 10) / 10,
      toelichting: `${seg.wegnaam} — bestrating`,
    });
  }
  return posts;
}

function mergePosts(posts: AfgeleidePost[]): AfgeleidePost[] {
  const map = new Map<string, AfgeleidePost>();
  for (const p of posts) {
    const key = p.postnummer;
    const existing = map.get(key);
    if (existing) {
      existing.hoeveelheid += p.hoeveelheid;
      if (p.toelichting && !existing.toelichting?.includes(p.toelichting)) {
        existing.toelichting = [existing.toelichting, p.toelichting].filter(Boolean).join('; ');
      }
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()].filter((p) => p.hoeveelheid > 0);
}

/** Bepaal benodigde materialen en taken uit tracé. */
export function deriveCalculatiePosts(trace: DemoTrace): AfgeleidePost[] {
  const lengteTotaal = traceLengthM(trace.coordinates, trace.traceLines);
  const perTech = lengtePerLegtechniek(trace);
  const openL = perTech.open_ontgraving ?? 0;
  const hddL = perTech.hdd ?? 0;
  const persingL = perTech.persing ?? 0;
  const sleufloosL = perTech.sleufloos ?? 0;
  const sleufB = sleufBreedteM(trace.discipline);
  const sleufD = sleufDiepteM(trace);

  const posts: AfgeleidePost[] = [
    { postnummer: '01.01.010', hoeveelheid: 1, toelichting: 'Tracé-inventarisatie' },
    { postnummer: '01.02.010', hoeveelheid: Math.max(4, Math.ceil(lengteTotaal / 200)), toelichting: 'KLIC/WIBON' },
    { postnummer: '01.03.010', hoeveelheid: Math.max(1, Math.ceil(lengteTotaal / 300)), toelichting: 'Werkvakken' },
    { postnummer: materiaalPostnummer(trace), hoeveelheid: lengteTotaal, toelichting: trace.netType },
    { postnummer: '03.05.010', hoeveelheid: lengteTotaal, toelichting: 'Detectielint' },
    { postnummer: '07.01.010', hoeveelheid: 2, toelichting: 'Start + eind' },
    { postnummer: '07.02.010', hoeveelheid: 1, toelichting: 'Netbeheerder' },
  ];

  const mofCount = Math.max(1, Math.ceil(lengteTotaal / 150));
  posts.push({ postnummer: '03.06.010', hoeveelheid: mofCount, toelichting: `${mofCount} moffen (ca. 150 m)` });

  if (openL > 0) {
    const ontgravingM3 = Math.round(openL * sleufB * sleufD * 10) / 10;
    const zandM3 = Math.round(openL * sleufB * 0.15 * 10) / 10;
    posts.push(
      { postnummer: '02.01.010', hoeveelheid: ontgravingM3, toelichting: `${openL} m open sleuf` },
      { postnummer: '02.02.010', hoeveelheid: zandM3 },
      { postnummer: '02.03.010', hoeveelheid: Math.round(ontgravingM3 * 0.85 * 10) / 10 },
      { postnummer: '02.04.010', hoeveelheid: openL },
      { postnummer: '04.01.010', hoeveelheid: openL },
      { postnummer: '04.02.010', hoeveelheid: openL },
    );
  }

  if (hddL > 0) {
    const hddSegmentCount = trace.segmenten.filter((s) => s.legtechniek === 'hdd').length;
    posts.push(
      { postnummer: '05.01.010', hoeveelheid: hddL, toelichting: 'HDD' },
      { postnummer: '05.01.020', hoeveelheid: hddSegmentCount * 2, toelichting: 'Start + eindput per segment' },
      { postnummer: '05.01.030', hoeveelheid: Math.round(hddL * 0.08 * 10) / 10, toelichting: 'Boormedium' },
      { postnummer: '03.04.010', hoeveelheid: hddL, toelichting: 'Mantelbuis HDD' },
    );
  }

  if (persingL > 0) {
    const persCount = trace.segmenten.filter((s) => s.legtechniek === 'persing').length;
    posts.push(
      { postnummer: '05.02.010', hoeveelheid: persingL },
      { postnummer: '05.02.020', hoeveelheid: persCount * 2 },
      { postnummer: '03.04.010', hoeveelheid: persingL, toelichting: 'Mantelbuis persing' },
    );
  }

  if (sleufloosL > 0) {
    posts.push({ postnummer: '05.03.010', hoeveelheid: sleufloosL, toelichting: 'Asfaltzagen/sleufloos' });
  }

  for (const seg of trace.segmenten) {
    if (seg.legtechniek === 'open_ontgraving' || seg.legtechniek === 'sleufloos') {
      posts.push(...herstelPerSegment(seg));
    }
  }

  if (!trace.segmenten.length) {
    posts.push({
      postnummer: '06.03.010',
      hoeveelheid: lengteTotaal,
      toelichting: 'Bermherstel (default)',
    });
  }

  return mergePosts(posts);
}
