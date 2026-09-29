import { useEffect, useState } from 'react';

export interface MapPlace {
  cityName: string;
  stateName: string;
  latitude: number;
  longitude: number;
  label: string;
}

interface LocationMapPreviewProps {
  cityName: string;
  stateName: string;
  latitude: string;
  longitude: string;
  adding?: boolean;
  onAddPlace: (place: MapPlace) => void;
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
}

interface NominatimHit {
  lat: string;
  lon: string;
  display_name: string;
  namedetails?: Record<string, string>;
  address?: NominatimAddress;
}

function buildMapQuery(cityName: string, stateName: string, latitude: string, longitude: string): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (latitude.trim() && longitude.trim() && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat},${lng}`;
  }
  const place = [cityName.trim(), stateName.trim()].filter(Boolean).join(', ');
  return place || 'Palwal, Haryana';
}

function englishName(hit: NominatimHit, fallback: string): string {
  const named = hit.namedetails;
  const english = named?.['name:en'] || named?.['name:en-IN'] || named?.int_name;
  return (english || fallback).trim();
}

function placeFromHit(hit: NominatimHit): MapPlace {
  const address = hit.address;
  const localCity = (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    hit.display_name.split(',')[0]
  ).trim();
  return {
    cityName: englishName(hit, localCity),
    stateName: address?.state?.trim() || '',
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    label: hit.display_name
  };
}

export default function LocationMapPreview({
  cityName,
  stateName,
  latitude,
  longitude,
  adding = false,
  onAddPlace
}: LocationMapPreviewProps) {
  const [query, setQuery] = useState('Palwal, Haryana');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MapPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const next = buildMapQuery(cityName, stateName, latitude, longitude);
    const timer = window.setTimeout(() => setQuery(next), 350);
    return () => window.clearTimeout(timer);
  }, [cityName, stateName, latitude, longitude]);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      setSearchError('');
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError('');
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&namedetails=1&accept-language=en&countrycodes=in&limit=5&q=${encodeURIComponent(term)}`;
      fetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'Accept-Language': 'en' } })
        .then(async (res) => {
          if (!res.ok) throw new Error('Search failed');
          const data = (await res.json()) as NominatimHit[];
          setResults(Array.isArray(data) ? data.map(placeFromHit).filter((place) => place.cityName) : []);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setResults([]);
          setSearchError('Could not search the map. Try again.');
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed`;

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#111827' }}>
        Map Preview
      </h2>
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search a city, then add it to the list"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid #d1d5db',
            fontSize: '14px'
          }}
        />
        {(searching || searchError || results.length > 0) && (
          <div
            style={{
              position: 'absolute',
              zIndex: 2,
              left: 0,
              right: 0,
              top: 'calc(100% + 6px)',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              overflow: 'hidden'
            }}
          >
            {searching && <div style={{ padding: '12px 14px', color: '#64748b', fontSize: '13px' }}>Searching…</div>}
            {searchError && <div style={{ padding: '12px 14px', color: '#dc2626', fontSize: '13px' }}>{searchError}</div>}
            {results.map((place) => (
              <button
                key={`${place.label}-${place.latitude}`}
                type="button"
                disabled={adding}
                onClick={() => {
                  onAddPlace(place);
                  setSearch('');
                  setResults([]);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  background: '#fff',
                  cursor: adding ? 'wait' : 'pointer',
                  fontSize: '13px',
                  color: '#111827'
                }}
              >
                <strong>{place.cityName}</strong>
                {place.stateName ? `, ${place.stateName}` : ''}
                <div style={{ color: '#64748b', marginTop: '2px' }}>{place.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <iframe
        title="City map preview"
        src={src}
        width="100%"
        height="300"
        style={{ border: 0, borderRadius: '12px' }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#64748b' }}>{query}</p>
    </div>
  );
}
