import type { BboxQuery } from '../types';
import { fetchWithTimeout } from './fetch-timeout';

/** MapServer WFS (GML 3.2) → GeoJSON — voor Bodemloket e.d. zonder JSON-output. */
export async function fetchExternalWfsGml(
  baseUrl: string,
  typeNames: string,
  bbox: BboxQuery,
  maxFeatures = 50
): Promise<GeoJSON.FeatureCollection> {
  const url = new URL(baseUrl);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeNames', typeNames);
  url.searchParams.set(
    'bbox',
    `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY},urn:ogc:def:crs:EPSG::28992`
  );
  url.searchParams.set('srsName', 'urn:ogc:def:crs:EPSG::28992');
  url.searchParams.set('count', String(maxFeatures));
  url.searchParams.set('outputFormat', 'application/gml+xml; version=3.2');

  const res = await fetchWithTimeout(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`WFS GML ${typeNames}: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return gmlToFeatureCollection(xml);
}

function parsePosList(text: string): [number, number][] {
  const nums = text.trim().split(/\s+/).map(Number);
  const ring: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    if (Number.isFinite(nums[i]) && Number.isFinite(nums[i + 1])) {
      ring.push([nums[i], nums[i + 1]]);
    }
  }
  return ring;
}

function ringToGeometry(ring: [number, number][]): GeoJSON.Geometry | null {
  if (ring.length < 1) return null;
  if (ring.length < 4) {
    return { type: 'Point', coordinates: ring[0] };
  }
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring
      : [...ring, ring[0]];
  return { type: 'Polygon', coordinates: [closed] };
}

function extractProperties(memberXml: string): Record<string, string> {
  const props: Record<string, string> = {};
  const re = /<(?:ms|wfs|gml|[\w]+):([\w]+)>([^<]*)<\/(?:ms|wfs|gml|[\w]+):\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(memberXml)) !== null) {
    const key = m[1];
    if (key === 'msGeometry' || key === 'boundedBy' || key.startsWith('geometry')) continue;
    const val = m[2].trim();
    if (val) props[key] = val;
  }
  return props;
}

function gmlToFeatureCollection(xml: string): GeoJSON.FeatureCollection {
  const members = xml.split(/<wfs:member>/i).slice(1);
  const features: GeoJSON.Feature[] = [];

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const posMatch = member.match(/<gml:posList[^>]*>([^<]+)<\/gml:posList>/i);
    if (!posMatch) continue;
    const ring = parsePosList(posMatch[1]);
    const geometry = ringToGeometry(ring);
    if (!geometry) continue;
    features.push({
      type: 'Feature',
      id: `gml-${i}`,
      properties: extractProperties(member),
      geometry,
    });
  }

  return { type: 'FeatureCollection', features };
}
