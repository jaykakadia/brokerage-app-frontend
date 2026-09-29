import { useEffect, useMemo, useState } from 'react';
import api, { getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FloatField, FloatSelect } from './fields';
import { digitsOnly, stateForCity, type CityOption } from './propertyForm';
import type { ApiResponse, Category, Listing, RefCodeItem } from '../../types';

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
  categoryId: string;
  categoryName: string;
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
  categoryId: '',
  categoryName: '',
  categorySearch: '',
  description: ''
};

export interface BusinessListingFormProps {
  cities: CityOption[];
  refCodes: RefCodeItem[];
  onSuccess: (listing: Listing) => void;
  onStepChange?: (step: number) => void;
}

export default function BusinessListingForm({ cities, refCodes, onSuccess, onStepChange }: BusinessListingFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<BusinessFormState>(EMPTY_BUSINESS);
  const [codes, setCodes] = useState<RefCodeItem[]>(refCodes);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCodes(refCodes);
  }, [refCodes]);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  useEffect(() => {
    if (!user) return;
    const mobile = digitsOnly(user.phone || '', 10);
    setForm((current) => ({
      ...current,
      person: current.person || user.name || '',
      mobile: current.mobile || mobile,
      whatsapp: current.whatsapp || (current.sameAsMobile ? (current.mobile || mobile) : ''),
      email: current.email || user.email || ''
    }));
  }, [user]);

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
    if (!query) return categories.slice(0, 8);
    return categories.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 8);
  }, [categories, form.categorySearch]);

  const continueFrom = (next: 2 | 3 | 4) => {
    if (step === 1) {
      if (!form.name.trim()) return setError('Please enter your Business Name');
      if (!/^\d{6}$/.test(form.pincode)) return setError('Enter a valid 6-digit Pincode');
      if (!form.city) return setError('Please select a City');
      if (!form.state.trim()) return setError('State is missing. Pick a city that has a state.');
    }
    if (step === 2) {
      if (!form.person.trim()) return setError('Please enter Contact Person name');
      if (!/^\d{10}$/.test(form.mobile)) return setError('Enter a valid 10-digit Mobile Number');
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid Email Address');
    }
    if (step === 3 && !form.categoryName.trim()) return setError('Search and select a Business Category');
    setError(null);
    setStep(next);
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
    if (photos.length + incoming.length > 10) {
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
      `Category: ${form.categoryName || '-'}`,
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
      if (form.refCode.trim()) fd.append('reference_code', form.refCode.trim());
      fd.append('form_data', JSON.stringify({ kind: 'business', ...form }));
      photos.forEach((photo) => fd.append('photos', photo));
      const res = await api.post<ApiResponse<Listing>>('/api/v1/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.status === 'success' && res.data.data) {
        onSuccess(res.data.data);
      } else {
        setError('Listing could not be saved. Please check the form.');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to post the business listing.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="business-premium-box">
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {step === 1 && (
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
          <div className="bf-row">
            <FloatSelect label="City" required value={form.city} onChange={(city) => patch({ city, state: stateForCity(city, cities) })}>
              {cities.map((item) => <option key={item.city} value={item.city}>{item.city}</option>)}
            </FloatSelect>
            <FloatField label="State" required readOnly value={form.state} onChange={() => undefined} />
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
                <FloatField label="Search Ref Code" value={form.refSearch} onChange={(refSearch) => patch({ refSearch })} />
              </div>
              <button type="button" className="btn-outline" style={{ flex: 1, marginTop: 0, padding: 12 }} onClick={() => { void searchRef(); }}>
                <i className="fas fa-search"></i> Search
              </button>
            </div>
          </div>
          <button type="button" className="btn-premium" onClick={() => continueFrom(2)}>Save and Continue <i className="fas fa-arrow-right"></i></button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="bf-heading"><i className="fas fa-address-card"></i> Contact Details</div>
          <FloatField label="Contact Person" icon="fas fa-user" required value={form.person} onChange={(person) => patch({ person })} />
          <div style={{ marginTop: 16 }}>
            <FloatField label="Mobile Number" prefix="+91" required type="tel" inputMode="tel" maxLength={10} value={form.mobile} onChange={(value) => patch({ mobile: digitsOnly(value, 10) })} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FloatField label="WhatsApp Number" prefix="+91" type="tel" inputMode="tel" maxLength={10} value={form.whatsapp} onChange={(value) => patch({ whatsapp: digitsOnly(value, 10), sameAsMobile: false })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Auto-filled from mobile — change if different</span>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.sameAsMobile} onChange={(e) => patch({ sameAsMobile: e.target.checked, whatsapp: e.target.checked ? form.mobile : form.whatsapp })} />
              Same As Mobile Number
            </label>
          </div>
          <FloatField label="Email Address" icon="fas fa-envelope" required type="email" value={form.email} onChange={(email) => patch({ email })} />
          <div className="bf-row" style={{ marginTop: 20 }}>
            <button type="button" className="btn-outline" style={{ flex: 1, marginTop: 0 }} onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn-premium" style={{ flex: 2, marginTop: 0 }} onClick={() => continueFrom(3)}>Save and Continue <i className="fas fa-arrow-right"></i></button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="bf-heading"><i className="fas fa-tags"></i> Add Business Category</div>
          <div className="premium-float cat-search-wrap" style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder=" "
              value={form.categorySearch}
              onChange={(e) => {
                patch({ categorySearch: e.target.value, categoryId: '', categoryName: '' });
                setShowCategories(true);
              }}
              onFocus={() => setShowCategories(true)}
            />
            <label>Search / Select Category <span style={{ color: '#dc2626' }}> *</span></label>
            <i className="fas fa-search field-icon"></i>
            {showCategories ? (
              <div className="cat-suggestions">
                {suggestions.length === 0 ? (
                  <div className="cat-suggestion-empty">No matching category</div>
                ) : suggestions.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="cat-suggestion-item"
                    onClick={() => {
                      patch({ categoryId: String(item.id), categoryName: item.name, categorySearch: item.name });
                      setShowCategories(false);
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="bf-row" style={{ marginTop: 20 }}>
            <button type="button" className="btn-outline" style={{ flex: 1, marginTop: 0 }} onClick={() => setStep(2)}>Back</button>
            <button type="button" className="btn-premium" style={{ flex: 2, marginTop: 0 }} onClick={() => continueFrom(4)}>Save and Continue <i className="fas fa-arrow-right"></i></button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="bf-heading"><i className="fas fa-camera"></i> Add Images</div>
          <div className="upload-area" onClick={() => document.getElementById('bPhotos')?.click()} style={{ marginBottom: 16 }}>
            <i className="fas fa-cloud-upload-alt upload-icon"></i>
            <div className="upload-title">Click to Add Business Photos</div>
            <div className="upload-sub">SVG, PNG, JPG or GIF (max. 5MB)</div>
            <input id="bPhotos" type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => addPhotos(e.target.files)} />
          </div>
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
          <div className="bf-row" style={{ marginTop: 20 }}>
            <button type="button" className="btn-outline" style={{ flex: 1, marginTop: 0 }} onClick={() => setStep(3)}>Back</button>
            <button type="button" className="btn-premium" style={{ flex: 2, marginTop: 0 }} disabled={loading} onClick={() => { void submit(); }}>
              {loading ? 'Submitting...' : <>Submit Profile <i className="fas fa-check"></i></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
