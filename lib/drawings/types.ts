export type DrawingType =
  | 'trace_plan'
  | 'length_profile'
  | 'cross_section'
  | 'crossing_detail'
  | 'station'
  | 'bore_plan'
  | 'bore_profile';

export interface DrawingResult {
  type: DrawingType;
  label: string;
  svg: string;
  formaat: 'svg';
  segmentVolgorde?: number;
}
