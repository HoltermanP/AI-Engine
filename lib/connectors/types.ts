export type ConnectorMode = 'live' | 'demo';

export interface ConnectorStatus {
  id: string;
  label: string;
  mode: ConnectorMode;
  configured: boolean;
  requiresKey: boolean;
  note?: string;
}

export interface ConnectorResultMeta {
  _source: ConnectorMode;
}

export interface DataConnector<TQuery, TResult> {
  status(): ConnectorStatus;
  fetch(query: TQuery): Promise<TResult & ConnectorResultMeta>;
  testConnection?(): Promise<{ ok: boolean; message: string }>;
}

export interface BboxQuery {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TraceQuery {
  traceId: string;
  coordinates: [number, number, number?][];
  bbox: BboxQuery;
}
