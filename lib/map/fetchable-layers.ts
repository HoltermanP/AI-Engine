export const FETCHABLE_MAP_LAYERS = [
  'bgt',
  'bomen',
  'percelen',
  'nwb',
  'watergangen',
  'belemmeringen',
  'natura2000',
  'sonderingen',
  'grondwater',
  'vervuilde-grond',
] as const;

export type FetchableMapLayerId = (typeof FETCHABLE_MAP_LAYERS)[number];

export function isFetchableMapLayer(id: string): id is FetchableMapLayerId {
  return (FETCHABLE_MAP_LAYERS as readonly string[]).includes(id);
}

/** Koppeling laag-id → MapLayerData-veld. */
export const LAYER_DATA_FIELD: Record<
  FetchableMapLayerId,
  'bgt' | 'bomen' | 'percelen' | 'nwb' | 'watergangen' | 'belemmeringen' | 'natura2000' | 'sonderingen' | 'grondwater' | 'vervuildeGrond'
> = {
  bgt: 'bgt',
  bomen: 'bomen',
  percelen: 'percelen',
  nwb: 'nwb',
  watergangen: 'watergangen',
  belemmeringen: 'belemmeringen',
  natura2000: 'natura2000',
  sonderingen: 'sonderingen',
  grondwater: 'grondwater',
  'vervuilde-grond': 'vervuildeGrond',
};
