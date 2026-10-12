import { useState, useMemo, useEffect } from 'react';
import type { NavigateFunction } from '../types';
import { ALL_INDIAN_CITIES, TOP_CITIES, getCitySlug } from '../config/cities';
import api from '../services/api';

interface CitiesPageProps {
  onNavigate: NavigateFunction;
}

export default function CitiesPage({ onNavigate }: CitiesPageProps) {
  const [search, setSearch] = useState('');
  const [locations, setLocations] = useState<Array<{ city_name: string; state: string }>>([]);

  useEffect(() => {
    // Optionally fetch live locations from backend DB
    api.get('/api/v1/locations')
      .then((res: any) => {
        if (res.data?.status === 'success' && Array.isArray(res.data.data)) {
          setLocations(res.data.data);
        }
      })
      .catch(() => {
        // Fall back gracefully to ALL_INDIAN_CITIES
      });
  }, []);

  // Merge backend locations with static predefined list
  const stateGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, Set<string>>();

    // 1. Add static cities
    ALL_INDIAN_CITIES.forEach((c) => {
      const stateName = c.state || 'Other';
      if (!map.has(stateName)) map.set(stateName, new Set());
      map.get(stateName)!.add(c.name);
    });

    // 2. Add any extra DB locations
    locations.forEach((loc) => {
      const stateName = loc.state?.trim() || 'Other';
      if (!map.has(stateName)) map.set(stateName, new Set());
      map.get(stateName)!.add(loc.city_name.trim());
    });

    // 3. Filter and structure
    const result: Array<{ state: string; cities: Array<{ name: string; slug: string }> }> = [];

    const sortedStates = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    sortedStates.forEach((state) => {
      const citiesSet = map.get(state)!;
      const sortedCities = Array.from(citiesSet)
        .filter((cityName) => {
          if (!q) return true;
          return cityName.toLowerCase().includes(q) || state.toLowerCase().includes(q);
        })
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({
          name,
          slug: getCitySlug(name),
        }));

      if (sortedCities.length > 0) {
        result.push({ state, cities: sortedCities });
      }
    });

    return result;
  }, [locations, search]);

  const totalCitiesCount = useMemo(() => {
    return stateGroups.reduce((acc, g) => acc + g.cities.length, 0);
  }, [stateGroups]);

  return (
    <div style={{ background: '#f8fafc', minHeight: '80vh', padding: '40px 16px 80px 16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          <a href="/home" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} style={{ color: '#0c6253', textDecoration: 'none' }}>Home</a>
          <span>/</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>All Cities</span>
        </div>

        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
            Find Properties Across India
          </h1>
          <p style={{ fontSize: '16px', color: '#475569', maxWidth: '640px', margin: '0 auto 24px auto' }}>
            Browse verified residential and commercial properties by city. Select your city to explore zero brokerage listings.
          </p>

          {/* Search Box */}
          <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city or state (e.g. Pune, Bangalore, Maharashtra)..."
              style={{
                width: '100%',
                padding: '12px 18px 12px 42px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '15px',
                background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                outline: 'none',
              }}
            />
            <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '15px', color: '#94a3b8' }}></i>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Top Featured Cities Row */}
        {!search && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-fire" style={{ color: '#ea580c' }}></i> Popular Real Estate Hubs
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {TOP_CITIES.map((c) => (
                <a
                  key={c.slug}
                  href={`/properties/${c.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('properties-city', c.slug);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px 8px',
                    borderRadius: '8px',
                    background: '#f0fdfa',
                    border: '1px solid #ccfbf1',
                    color: '#0f766e',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    textAlign: 'center',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  <i className="fas fa-building" style={{ marginBottom: '6px', fontSize: '16px', color: '#0d9488' }}></i>
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Cities Grouped by State */}
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
          Showing {totalCitiesCount} cities across {stateGroups.length} states & union territories
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {stateGroups.map((group) => (
            <div
              key={group.state}
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                border: '1px solid #f1f5f9'
              }}
            >
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{group.state}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#94a3b8' }}>
                  {group.cities.length} {group.cities.length === 1 ? 'city' : 'cities'}
                </span>
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                gap: '10px 16px'
              }}>
                {group.cities.map((city) => (
                  <a
                    key={city.slug}
                    href={`/properties/${city.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('properties-city', city.slug);
                    }}
                    style={{
                      color: '#334155',
                      textDecoration: 'none',
                      fontSize: '14px',
                      padding: '4px 0',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'color 0.15s',
                    }}
                  >
                    <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: '#0d9488' }}></i>
                    {city.name}
                  </a>
                ))}
              </div>
            </div>
          ))}

          {stateGroups.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 16px', background: '#fff', borderRadius: '12px' }}>
              <i className="fas fa-search-location" style={{ fontSize: '32px', color: '#cbd5e1', marginBottom: '12px' }}></i>
              <p style={{ color: '#64748b', fontSize: '15px' }}>No cities found matching "{search}".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
