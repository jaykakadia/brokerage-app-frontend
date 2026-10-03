import { useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ExistingPhotos, FloatField, scrollFormToTop, FloatSelect, PhoneWhatsAppFields, RefCodeSearch, SocialLinkFields, StepIndicator } from './fields';
import { StateOptions } from '../../utils/indianStates';
import { digitsOnly, normalizedSocialLinks, profileContactDefaults, socialLinkError, stateForCity, type CityOption } from './propertyForm';
import type { ApiResponse, Category, Listing, RefCodeItem } from '../../types';

interface SelectedCategory {
  id: string;
  name: string;
}

interface BusinessFormState {
  name: string;
  pincode: string;
  plot: string;
  building: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  refCode: string;
  refSearch: string;
  person: string;
  mobile: string;
  whatsapp: string;
  sameAsMobile: boolean;
  email: string;
  facebookUrl: string;
  websiteUrl: string;
  xUrl: string;
  selectedCategories: SelectedCategory[];
  categorySearch: string;
  description: string;
}

const EMPTY_BUSINESS: BusinessFormState = {
  name: '',
  pincode: '',
  plot: '',
  building: '',
  street: '',
  landmark: '',
  area: '',
  city: '',
  state: '',
  refCode: '',
  refSearch: '',
  person: '',
  mobile: '',
  whatsapp: '',
  sameAsMobile: true,
  email: '',
  facebookUrl: '',
  websiteUrl: '',
  xUrl: '',
  selectedCategories: [],
  categorySearch: '',
  description: ''
};

// Fields reused from the user's last business listing (not description, photos or ref code)
const REUSABLE_FIELDS = [
  'name', 'pincode', 'plot', 'building', 'street', 'landmark', 'area', 'city', 'state',
  'person', 'mobile', 'whatsapp', 'sameAsMobile', 'email', 'facebookUrl', 'websiteUrl', 'xUrl'
] as const satisfies ReadonlyArray<keyof BusinessFormState>;

/** Rebuilds the form from a saved business listing (edit mode). */
function businessFormFromListing(listing: Listing): BusinessFormState {
  const saved = (listing.form_data || {}) as Partial<BusinessFormState> & { categoryId?: string; categoryName?: string };
  const next: BusinessFormState = { ...EMPTY_BUSINESS };
  for (const key of Object.keys(EMPTY_BUSINESS) as Array<keyof BusinessFormState>) {
    const value = saved[key];
    if (value !== undefined && value !== null) (next as unknown as Record<string, unknown>)[key] = value;
  }
  if (!Array.isArray(next.selectedCategories) || next.selectedCategories.length === 0) {
    // Older listings saved a single categoryId / categoryName
    next.selectedCategories = saved.categoryName ? [{ id: saved.categoryId || '', name: saved.categoryName }] : [];
  }
  return {
    ...next,
    name: next.name || listing.title,
    person: next.person || listing.owner_name,
    refCode: next.refCode || listing.reference_code || '',
    refSearch: '',
    categorySearch: ''
  };
}

const BUSINESS_STEPS = [
  { label: 'Contact Details', icon: 'fas fa-address-card' },
  { label: 'Business Details', icon: 'fas fa-store' },
  { label: 'Categories', icon: 'fas fa-tags' },
  { label: 'Photos & Submit', icon: 'fas fa-camera' }
];

export interface BusinessListingFormProps {
  cities: CityOption[];
  refCodes: RefCodeItem[];
  onSuccess: (listing: Listing) => void;
  onStepChange?: (step: number) => void;
  /** Edit mode: fill the form from this listing and save changes to it instead of creating a new one */
  editListing?: Listing | null;
  /** Show every section on one page with a single Save button (admin edit) */
  singlePage?: boolean;
}

export default function BusinessListingForm({ cities, refCodes, onSuccess, onStepChange, editListing = null, singlePage = false }: BusinessListingFormProps) {
  const { user: authUser } = useAuth();
  // In edit mode the form holds the saved listing, so the signed-in user's profile must not prefill it
  const user = editListing ? null : authUser;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<BusinessFormState>(() => (editListing ? businessFormFromListing(editListing) : EMPTY_BUSINESS));
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [codes, setCodes] = useState<RefCodeItem[]>(refCodes);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prefilledFromLast, setPrefilledFromLast] = useState(false);

  useEffect(() => {
    setCodes(refCodes);
  }, [refCodes]);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (!user) return;
    const profile = profileContactDefaults(user);
    setForm((current) => ({
      ...current,
      name: current.name || user.business_name || user.name || '',
      person: current.person || user.name || '',
      // Only take the profile's phone/WhatsApp pair if the user hasn't typed a mobile yet
      ...(current.mobile ? {} : { mobile: profile.mobile, whatsapp: profile.whatsapp, sameAsMobile: profile.sameAsMobile }),
      email: current.email || user.email || '',
      facebookUrl: current.facebookUrl || profile.facebookUrl,
      websiteUrl: current.websiteUrl || profile.websiteUrl,
      xUrl: current.xUrl || profile.xUrl
    }));
  }, [user]);

  // Pre-fill business name, address, category and contact from the user's most recent business listing
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get<ApiResponse<Listing[]>>('/api/v1/listings', { params: { user_id: user.id, status: 'all' } })
      .then((res) => {
        const last = (res.data?.data || []).find((item) => (item.form_data as { kind?: string } | null)?.kind === 'business');
        const saved = last?.form_data as Partial<BusinessFormState> | undefined;
        if (cancelled || !saved) return;
        setForm((current) => {
          const next = { ...current };
          for (const key of REUSABLE_FIELDS) {
            const value = saved[key];
            if (value === undefined || value === null || value === '') continue;
            // Only fill fields the user hasn't typed into yet (business name may still hold the profile name)
            const untouched = current[key] === '' || current[key] === EMPTY_BUSINESS[key] || (key === 'name' && !user.business_name && current.name === user.name);
            if (key === 'sameAsMobile' || untouched) {
              (next as Record<string, unknown>)[key] = value;
            }
          }
          if (next.city && !next.state) next.state = stateForCity(next.city, cities);
          if (current.selectedCategories.length === 0) {
            // Older listings saved a single categoryId / categoryName
            const legacy = saved as { categoryId?: string; categoryName?: string };
            const savedCats = Array.isArray(saved.selectedCategories) && saved.selectedCategories.length > 0
              ? saved.selectedCategories
              : legacy.categoryName ? [{ id: legacy.categoryId || '', name: legacy.categoryName }] : [];
            next.selectedCategories = savedCats;
          }
          return next;
        });
        setPrefilledFromLast(true);
      })
      .catch(() => {/* no previous listing -> keep profile defaults */});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const clearPrefill = () => {
    setForm({
      ...EMPTY_BUSINESS,
      ...(user ? profileContactDefaults(user) : {}),
      name: user?.business_name || user?.name || '',
      person: user?.name || '',
      email: user?.email || ''
    });
    setPrefilledFromLast(false);
    setError(null);
  };

  useEffect(() => {
    api.get<ApiResponse<Category[]>>('/api/v1/categories')
      .then((res) => {
        if (Array.isArray(res.data?.data)) setCategories(res.data.data);
      })
      .catch(() => {});
  }, []);

  const patch = (next: Partial<BusinessFormState>) => {
    setForm((current) => {
      const merged = { ...current, ...next };
      if (merged.sameAsMobile && (next.mobile !== undefined || next.sameAsMobile)) {
        merged.whatsapp = merged.mobile;
      }
      return merged;
    });
    setError(null);
  };

  const suggestions = useMemo(() => {
    const query = form.categorySearch.trim().toLowerCase();
    const chosen = new Set(form.selectedCategories.map((c) => c.name.toLowerCase()));
    const available = categories.filter((item) => !chosen.has(item.name.toLowerCase()));
    if (!query) return available.slice(0, 8);
    return available.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [categories, form.categorySearch, form.selectedCategories]);

  const addCategory = (item: Category) => {
    patch({
      selectedCategories: [...form.selectedCategories, { id: String(item.id), name: item.name }],
      categorySearch: ''
    });
  };

  const removeCategory = (name: string) => {
    patch({ selectedCategories: form.selectedCategories.filter((c) => c.name !== name) });
  };

  const categoryNames = form.selectedCategories.map((c) => c.name).join(', ');

  const stepError = (s: 1 | 2 | 3): string | null => {
    if (s === 1) {
      if (!form.person.trim()) return 'Please enter Contact Person name';
      if (!/^\d{10}$/.test(form.mobile)) return 'Enter a valid 10-digit Mobile Number';
      if (!form.sameAsMobile && form.whatsapp && !/^\d{10}$/.test(form.whatsapp)) return 'Enter a valid 10-digit WhatsApp Number';
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid Email Address';
      return socialLinkError(form);
    }
    if (s === 2) {
      if (!form.name.trim()) return 'Please enter your Business Name';
      if (!/^\d{6}$/.test(form.pincode)) return 'Enter a valid 6-digit Pincode';
      if (!form.city) return 'Please select a City';
      if (!form.state.trim()) return 'State is missing. Pick a city that has a state.';
      return null;
    }
    return form.selectedCategories.length === 0 ? 'Search and select at least one Business Category' : null;
  };

  const continueFrom = (next: 2 | 3 | 4) => {
    const message = stepError((next - 1) as 1 | 2 | 3);
    if (message) return setError(message);
    goToStep(next);
  };

  const show = (s: 1 | 2 | 3 | 4): boolean => singlePage || step === s;

  const goToStep = (next: 1 | 2 | 3 | 4) => {
    setError(null);
    setStep(next);
    scrollFormToTop();
  };

  const searchRef = async () => {
    try {
      const res = await api.get<ApiResponse<RefCodeItem[]>>('/api/v1/employees/ref-codes', {
        params: { q: form.refSearch }
      });
      if (Array.isArray(res.data?.data)) setCodes(res.data.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not search reference codes.'));
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const keptExisting = (editListing?.images.length || 0) - removedImageIds.length;
    if (keptExisting + photos.length + incoming.length > 10) {
      setError('You can upload a maximum of 10 photos.');
      return;
    }
    const accepted: File[] = [];
    const urls: string[] = [];
    for (const file of incoming) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds 5 MB.`);
        continue;
      }
      accepted.push(file);
      urls.push(URL.createObjectURL(file));
    }
    setPhotos((current) => [...current, ...accepted]);
    setPreviews((current) => [...current, ...urls]);
  };

  const submit = async () => {
    if (singlePage) {
      // One page: the step checks never ran, so run them all before saving
      for (const s of [1, 2, 3] as const) {
        const message = stepError(s);
        if (message) {
          setError(message);
          return;
        }
      }
    }
    const words = form.description.trim().split(/\s+/).filter(Boolean);
    if (words.length > 400) {
      setError('Description cannot exceed 400 words.');
      return;
    }
    const address = [form.plot, form.building, form.street, form.landmark, form.area, form.city, form.state, form.pincode]
      .filter(Boolean)
      .join(', ');
    const description = [
      'Business listing',
      `${form.selectedCategories.length > 1 ? 'Categories' : 'Category'}: ${categoryNames || '-'}`,
      `Address: ${address}`,
      `Contact: ${form.person || '-'} / ${form.mobile || '-'} / ${form.email || '-'}`,
      `WhatsApp: ${form.whatsapp || form.mobile || '-'}`,
      form.description.trim() ? `Description: ${form.description.trim()}` : ''
    ].filter(Boolean).join('\n');

    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('title', form.name.trim());
      fd.append('location', [form.area, form.city].filter(Boolean).join(', ') || form.city);
      fd.append('price', '0');
      fd.append('description', description);
      fd.append('owner_name', form.person.trim() || form.name.trim());
      fd.append('owner_role', 'Owner');
      if (editListing) {
        // Always sent when editing so a cleared code is saved too
        fd.append('reference_code', form.refCode.trim());
        if (removedImageIds.length) fd.append('remove_image_ids', removedImageIds.join(','));
      } else if (form.refCode.trim()) {
        fd.append('reference_code', form.refCode.trim());
      }
      fd.append('form_data', JSON.stringify({
        kind: 'business',
        ...form,
        whatsapp: form.sameAsMobile ? form.mobile : form.whatsapp,
        ...normalizedSocialLinks(form),
        // Kept for older readers that expect a single category
        categoryId: form.selectedCategories.map((c) => c.id).join(','),
        categoryName: categoryNames
      }));
      photos.forEach((photo) => fd.append('photos', photo));
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const res = editListing
        ? await api.patch<ApiResponse<Listing>>(`/api/v1/listings/${editListing.id}`, fd, config)
        : await api.post<ApiResponse<Listing>>('/api/v1/listings', fd, config);
      if (res.data?.status === 'success' && res.data.data) {
        onSuccess(res.data.data);
      } else {
        setError('Listing could not be saved. Please check the form.');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, editListing ? 'Failed to save the business listing.' : 'Failed to post the business listing.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="business-premium-box">
      {singlePage ? null : <StepIndicator steps={BUSINESS_STEPS} current={step} />}
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {show(1) && (
        <>
          <div className="bf-heading"><i className="fas fa-address-card"></i> Contact Details</div>
          {prefilledFromLast && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#f0faf7', border: '1px solid #bbe5d8', color: '#0c6253', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
              <span><i className="fas fa-magic" style={{ marginRight: 6 }}></i>Filled from your last business listing. Edit anything that's different.</span>
              <button type="button" onClick={clearPrefill} style={{ background: 'none', border: 'none', color: '#0c6253', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                Start fresh
              </button>
            </div>
          )}
          <FloatField label="Contact Person" icon="fas fa-user" required value={form.person} onChange={(person) => patch({ person })} />
          <div style={{ marginTop: 16 }}>
            <PhoneWhatsAppFields mobile={form.mobile} whatsapp={form.whatsapp} sameAsMobile={form.sameAsMobile} onChange={patch} />
          </div>
          <FloatField label="Email Address" icon="fas fa-envelope" required type="email" value={form.email} onChange={(email) => patch({ email })} />
          <SocialLinkFields facebookUrl={form.facebookUrl} websiteUrl={form.websiteUrl} xUrl={form.xUrl} onChange={patch} />
          {singlePage ? null : (
            <div className="bf-actions">
              <button type="button" className="btn-premium" onClick={() => continueFrom(2)}>Next <i className="fas fa-arrow-right"></i></button>
            </div>
          )}
        </>
      )}

      {show(2) && (
        <>
          <div className="bf-heading"><i className="fas fa-store"></i> Enter Your Business Details</div>
          <FloatField label="Business Name" icon="fas fa-building" required value={form.name} onChange={(name) => patch({ name })} />
          <div style={{ marginTop: 16 }}>
            <FloatField label="Pincode" icon="fas fa-map-pin" required inputMode="numeric" maxLength={6} value={form.pincode} onChange={(value) => patch({ pincode: digitsOnly(value, 6) })} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FloatField label="Plot No. / Bldg No. / Shop No." icon="fas fa-home" value={form.plot} onChange={(plot) => patch({ plot })} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FloatField label="Building Name / Market / Society" icon="fas fa-city" value={form.building} onChange={(building) => patch({ building })} />
          </div>
          <div className="bf-row">
            <FloatField label="Street / Road Name" value={form.street} onChange={(street) => patch({ street })} />
            <FloatField label="Landmark" value={form.landmark} onChange={(landmark) => patch({ landmark })} />
          </div>
          <FloatField label="Area" icon="fas fa-map" value={form.area} onChange={(area) => patch({ area })} />
          <div className="bf-row keep-row">
            <FloatSelect label="City" required value={form.city} onChange={(city) => patch({ city, state: stateForCity(city, cities) })}>
              {cities.map((item) => <option key={item.city} value={item.city}>{item.city}</option>)}
            </FloatSelect>
            <FloatSelect label="State" required value={form.state} onChange={(state) => patch({ state })}>
              <StateOptions current={form.state} />
            </FloatSelect>
          </div>

          <div style={{ marginTop: 18, padding: 14, border: '1.5px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc' }}>
            <div className="bf-heading" style={{ marginBottom: 12, fontSize: 15 }}><i className="fas fa-id-badge"></i> Reference Code</div>
            <div className="bf-row" style={{ marginBottom: 0, alignItems: 'flex-end' }}>
              <div className="premium-float" style={{ flex: 2, marginBottom: 0 }}>
                <select className={`premium-select${form.refCode ? ' is-filled' : ''}`} style={{ paddingLeft: 12 }} value={form.refCode} onChange={(e) => patch({ refCode: e.target.value })}>
                  <option value="">Select Ref Code</option>
                  {codes.map((item) => (
                    <option key={item.reference_code} value={item.reference_code}>{item.reference_code} — {item.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <RefCodeSearch
                  value={form.refSearch}
                  onChange={(refSearch) => patch({ refSearch })}
                  onSelect={(item) => {
                    setCodes((current) => current.some((c) => c.reference_code === item.reference_code) ? current : [item, ...current]);
                    patch({ refCode: item.reference_code, refSearch: item.name });
                  }}
                />
              </div>
              <button type="button" className="btn-outline" style={{ flex: 1, marginTop: 0, padding: 12 }} onClick={() => { void searchRef(); }}>
                <i className="fas fa-search"></i> Search
              </button>
            </div>
          </div>
          {singlePage ? null : (
            <div className="bf-actions">
              <button type="button" className="btn-outline" onClick={() => goToStep(1)}><i className="fas fa-arrow-left"></i> Back</button>
              <button type="button" className="btn-premium" onClick={() => continueFrom(3)}>Next <i className="fas fa-arrow-right"></i></button>
            </div>
          )}
        </>
      )}

      {show(3) && (
        <>
          <div className="bf-heading"><i className="fas fa-tags"></i> Add Business Categories</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: -4, marginBottom: 10 }}>
            You can select more than one category.
          </div>
          {form.selectedCategories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {form.selectedCategories.map((cat) => (
                <span key={cat.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0faf7', border: '1px solid #0c6253', color: '#0c6253', borderRadius: 999, padding: '6px 8px 6px 14px', fontSize: 13, fontWeight: 600 }}>
                  {cat.name}
                  <button type="button" aria-label={`Remove ${cat.name}`} onClick={() => removeCategory(cat.name)}
                    style={{ background: '#0c6253', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }}>
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="premium-float cat-search-wrap" style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder=" "
              value={form.categorySearch}
              onChange={(e) => {
                patch({ categorySearch: e.target.value });
                setShowCategories(true);
              }}
              onFocus={() => setShowCategories(true)}
              onBlur={() => setTimeout(() => setShowCategories(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions.length > 0) { e.preventDefault(); addCategory(suggestions[0]); }
                if (e.key === 'Backspace' && !form.categorySearch && form.selectedCategories.length > 0) {
                  removeCategory(form.selectedCategories[form.selectedCategories.length - 1].name);
                }
              }}
            />
            <label>{form.selectedCategories.length > 0 ? 'Add another category' : 'Search / Select Category'} <span style={{ color: '#dc2626' }}> *</span></label>
            <i className="fas fa-search field-icon"></i>
          </div>
          {/* In normal flow (not floating) so the open list pushes Back/Next down instead of covering them */}
          {showCategories ? (
            <div className="cat-suggestions">
              {suggestions.length === 0 ? (
                <div className="cat-suggestion-empty">No matching category</div>
              ) : suggestions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="cat-suggestion-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addCategory(item)}
                >
                  <i className="fas fa-plus" style={{ fontSize: 11, color: '#94a3b8', marginRight: 8 }}></i>{item.name}
                </button>
              ))}
            </div>
          ) : null}
          {singlePage ? null : (
            <div className="bf-actions">
              <button type="button" className="btn-outline" onClick={() => goToStep(2)}><i className="fas fa-arrow-left"></i> Back</button>
              <button type="button" className="btn-premium" onClick={() => continueFrom(4)}>Next <i className="fas fa-arrow-right"></i></button>
            </div>
          )}
        </>
      )}

      {show(4) && (
        <>
          <div className="bf-heading"><i className="fas fa-camera"></i> Add Images</div>
          <div className="upload-area" onClick={() => document.getElementById('bPhotos')?.click()} style={{ marginBottom: 16 }}>
            <i className="fas fa-cloud-upload-alt upload-icon"></i>
            <div className="upload-title">Click to Add Business Photos</div>
            <div className="upload-sub">SVG, PNG, JPG or GIF (max. 5MB)</div>
            <input id="bPhotos" type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => addPhotos(e.target.files)} />
          </div>
          {editListing ? (
            <ExistingPhotos
              images={editListing.images}
              removedIds={removedImageIds}
              onRemove={(id) => setRemovedImageIds((current) => [...current, id])}
            />
          ) : null}
          {previews.length > 0 ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {previews.map((src, index) => (
                <div key={src} style={{ position: 'relative', width: 84, height: 84 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button type="button" onClick={() => { setPhotos((current) => current.filter((_, i) => i !== index)); setPreviews((current) => current.filter((_, i) => i !== index)); }} style={{ position: 'absolute', top: 4, right: 4, border: 'none', borderRadius: '50%', width: 20, height: 20, background: '#dc2626', color: '#fff', cursor: 'pointer' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            maxLength={4000}
            placeholder="Enter business description (max 400 words)..."
            onChange={(e) => patch({ description: e.target.value })}
            style={{ width: '100%', padding: 14, border: '1.5px solid #e2e8f0', borderRadius: 10, fontFamily: 'inherit', resize: 'vertical', minHeight: 100, marginBottom: 16, outline: 'none' }}
          />
          {singlePage && error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
              {error}
            </div>
          ) : null}
          <div className="bf-actions">
            {singlePage ? null : <button type="button" className="btn-outline" onClick={() => goToStep(3)}><i className="fas fa-arrow-left"></i> Back</button>}
            <button type="button" className="btn-premium" disabled={loading} onClick={() => { void submit(); }}>
              {loading ? 'Saving...' : editListing ? <>Save Changes <i className="fas fa-check"></i></> : <>Submit Profile <i className="fas fa-check"></i></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
