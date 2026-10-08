import { useMemo, useState } from 'react';
import { INDIAN_UNION_TERRITORIES } from '../utils/indianStates';
import { cityNameVariants } from '../utils/listingKind';
import type { Location } from '../types';

export interface AdminLocationsByStateProps {
  locations: Location[];
  /** Live listings per city, keyed by lower-cased city name. */
  listingCounts: Map<string, number>;
  loading: boolean;
  onDelete: (id: number) => void;
  onSave: (id: number, cityName: string) => Promise<void>;
}

const UNION_TERRITORIES = new Set<string>(INDIAN_UNION_TERRITORIES);
const byName = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' });

/**
 * Admin list of cities grouped by state / union territory, both in A–Z order, with the number of live
 * listings in each city. States start collapsed so thousands of cities stay manageable; searching opens
 * every state that has a match.
 */
export default function AdminLocationsByState({ locations, listingCounts, loading, onDelete, onSave }: AdminLocationsByStateProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const countFor = (label: string): number => {
    const seen = new Set<string>();
    return cityNameVariants(label).reduce((sum, name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return sum;
      seen.add(key);
      return sum + (listingCounts.get(key) ?? 0);
    }, 0);
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byState = new Map<string, Location[]>();
    locations.forEach((loc) => {
      const state = loc.state?.trim() || 'Other';
      if (q && !loc.city_name.toLowerCase().includes(q) && !state.toLowerCase().includes(q)) return;
      byState.set(state, [...(byState.get(state) ?? []), loc]);
    });
    return [...byState.entries()]
      .sort(([a], [b]) => byName(a, b))
      .map(([state, cities]) => {
        const sorted = [...cities].sort((a, b) => byName(a.city_name, b.city_name));
        // A city saved twice in one state must not count its listings twice
        const counted = new Set<string>();
        const listings = sorted.reduce((sum, loc) => {
          return sum + cityNameVariants(loc.city_name).reduce((part, name) => {
            const key = name.toLowerCase();
            if (counted.has(key)) return part;
            counted.add(key);
            return part + (listingCounts.get(key) ?? 0);
          }, 0);
        }, 0);
        return { state, cities: sorted, listings };
      });
  }, [locations, listingCounts, query]);

  const searching = query.trim() !== '';
  const toggle = (state: string) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(state)) next.delete(state); else next.add(state);
    return next;
  });
  const allOpen = groups.length > 0 && groups.every((g) => open.has(g.state));

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="admin-loc-head">
        <h2>
          Cities by State <span>({locations.length} cities · {new Set(locations.map((l) => l.state)).size} states / UTs)</span>
        </h2>
        <div className="admin-loc-tools">
          <input
            type="search"
            placeholder="Search city or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="btn-outline"
            onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.state)))}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loc-empty"><i className="fas fa-spinner fa-spin"></i> Loading locations...</div>
      ) : groups.length === 0 ? (
        <div className="admin-loc-empty">{searching ? `No city or state matches "${query.trim()}".` : 'No locations configured yet.'}</div>
      ) : (
        <div className="admin-loc-states">
          {groups.map(({ state, cities, listings }) => {
            const expanded = searching || open.has(state);
            return (
              <div key={state} className={`admin-loc-state${expanded ? ' is-open' : ''}`}>
                <button type="button" className="admin-loc-state-head" onClick={() => toggle(state)} aria-expanded={expanded}>
                  <i className={`fas fa-chevron-${expanded ? 'down' : 'right'}`}></i>
                  <span className="admin-loc-state-name">
                    {state}
                    {UNION_TERRITORIES.has(state) && <em>UT</em>}
                  </span>
                  <span className="admin-loc-state-meta">
                    {cities.length} {cities.length === 1 ? 'city' : 'cities'}
                    <strong className={listings > 0 ? 'has-listings' : ''}>
                      {listings} {listings === 1 ? 'listing' : 'listings'}
                    </strong>
                  </span>
                </button>

                {expanded && (
                  <table className="admin-loc-table">
                    <thead>
                      <tr>
                        <th>City</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'center' }}>Live Listings</th>
                        <th style={{ width: 110, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cities.map((loc) => {
                        const count = countFor(loc.city_name);
                        const editing = editingId === loc.id;
                        const save = async (): Promise<void> => {
                          const name = draft.trim();
                          if (!name || name === loc.city_name) {
                            setEditingId(null);
                            return;
                          }
                          setSaving(true);
                          try {
                            await onSave(loc.id, name);
                            setEditingId(null);
                          } finally {
                            setSaving(false);
                          }
                        };
                        return (
                          <tr key={loc.id}>
                            <td style={{ fontWeight: 700 }}>
                              {editing ? (
                                <input
                                  className="admin-loc-edit-input"
                                  value={draft}
                                  autoFocus
                                  disabled={saving}
                                  aria-label={`City name for ${loc.city_name}`}
                                  onChange={(e) => setDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); void save(); }
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                />
                              ) : loc.city_name}
                            </td>
                            <td style={{ textTransform: 'capitalize', color: '#6b7280' }}>{loc.category || 'city'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`admin-loc-count${count > 0 ? ' has-listings' : ''}`}>{count}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="admin-loc-actions">
                                {editing ? (
                                  <button
                                    type="button"
                                    className="btn-outline admin-loc-edit"
                                    title="Save city name"
                                    disabled={saving}
                                    onClick={() => void save()}
                                  >
                                    <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-outline admin-loc-edit"
                                    title={`Edit ${loc.city_name}`}
                                    onClick={() => { setEditingId(loc.id); setDraft(loc.city_name); }}
                                  >
                                    <i className="fas fa-pen"></i>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-outline admin-loc-delete"
                                  title={`Delete ${loc.city_name}`}
                                  disabled={saving}
                                  onClick={() => onDelete(loc.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
