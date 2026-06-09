'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { streetViewEmbedUrl } from '@/lib/connectors/mapillary/streetview';
import { Camera, ExternalLink, Loader2, MapPin, X } from 'lucide-react';

interface StreetViewPanelProps {
  lat: number;
  lng: number;
  onClose: () => void;
}

interface StreetViewResponse {
  image: {
    id: string;
    lat: number;
    lng: number;
    capturedAt?: string;
    compassAngle?: number;
  } | null;
  distanceM?: number;
  _source: 'live' | 'demo';
}

export function StreetViewPanel({ lat, lng, onClose }: StreetViewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StreetViewResponse | null>(null);

  const loadImage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/streetview?lat=${lat}&lng=${lng}&radius=50`);
      if (!res.ok) throw new Error('Straatbeeld ophalen mislukt');
      const json = (await res.json()) as StreetViewResponse;
      if (!json.image) {
        setError('Geen straatbeeld gevonden binnen 50 m van dit punt.');
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError('Straatbeeld kon niet geladen worden.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    void loadImage();
  }, [loadImage]);

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 flex max-h-[45%] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:left-auto sm:right-3 sm:w-[420px]">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-[#2D6FE8]" />
          <span className="text-sm font-medium">Straatbeeld</span>
          {data?._source === 'live' && (
            <Badge variant="outline" className="text-[10px]">
              Mapillary
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative min-h-[200px] flex-1 bg-muted">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Zoeken naar straatbeeld…
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-[10px] text-muted-foreground">
              Probeer een punt langs de weg te selecteren.
            </p>
          </div>
        )}

        {!loading && data?.image && (
          <iframe
            key={data.image.id}
            src={streetViewEmbedUrl(data.image.id, 'photo')}
            className="h-full min-h-[240px] w-full border-0"
            title="Mapillary straatbeeld"
            allowFullScreen
          />
        )}
      </div>

      {!loading && data?.image && (
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
          <span className="font-mono">
            {data.image.lat.toFixed(5)}, {data.image.lng.toFixed(5)}
            {data.distanceM !== undefined && ` · ${data.distanceM} m`}
          </span>
          <a
            href={`https://www.mapillary.com/app/?lat=${data.image.lat}&lng=${data.image.lng}&z=17`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#2D6FE8] hover:underline"
          >
            Open in Mapillary
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      )}
    </div>
  );
}
