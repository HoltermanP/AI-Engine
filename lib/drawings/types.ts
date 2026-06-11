export type DrawingType =
  | 'trace_plan'
  | 'length_profile'
  | 'cross_section'
  | 'crossing_detail'
  | 'station'
  | 'station_eenlijn'
  | 'station_plattegrond'
  | 'werktekening'
  | 'bore_plan'
  | 'bore_profile'
  | 'bore_setup';

export interface DrawingResult {
  type: DrawingType;
  label: string;
  svg: string;
  formaat: 'svg';
  segmentVolgorde?: number;
}
