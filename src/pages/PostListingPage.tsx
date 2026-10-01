import { useEffect, useState } from 'react';
import api, { getApiErrorMessage, getRefCodes } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PropertyListingForm from './post-listing/PropertyListingForm';
import BusinessListingForm from './post-listing/BusinessListingForm';
import {
  canonicalPosterRole,
  digitsOnly,
  EMPTY_PROPERTY_FORM,
  FALLBACK_CITIES,
  listingTitle,
  propertyPriceNumber,
  stateForCity,
  validatePropertyStep,
  type CityOption,
  type ListingRole,
  type PropertyFormState,
  type PropertyStep
} from './post-listing/propertyForm';
import type { Listing, Location, ApiResponse, NavigateFunction, RefCodeItem } from '../types';

export interface PostListingPageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: () => void;
}

export default function PostListingPage({ onNavigate, onOpenAuth }: PostListingPageProps) {
  const { user } = useAuth();
  const [role, setRole] = useState<ListingRole | ''>('');
  const [step, setStep] = useState<PropertyStep>(1);
  const [businessStep, setBusinessStep] = useState(1);
  const [form, setForm] = useState<PropertyFormState>(EMPTY_PROPERTY_FORM);
  const [cities, setCities] = useState<CityOption[]>(FALLBACK_CITIES);
  const [refCodes, setRefCodes] = useState<RefCodeItem[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successListing, setSuccessListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!user) return;
    const mobile = digitsOnly(user.phone || '', 10);
    setForm((current) => ({
      ...current,
      name: current.name || user.name || '',
      mobile: current.mobile || mobile,
      email: current.email || user.email || ''
    }));
  }, [user]);

  useEffect(() => {
    api.get<ApiResponse<Location[]>>('/api/v1/locations')
      .then((res) => {
        const rows = res.data?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        const next = rows
          .filter((row) => row.city_name)
          .map((row) => ({ city: row.city_name, state: row.state || stateForCity(row.city_name, FALLBACK_CITIES) }));
        const unique = Array.from(new Map(next.map((item) => [item.city, item])).values());
        if (unique.length > 0) setCities(unique);
      })
      .catch(() => {});
    getRefCodes()
      .then((res) => {
        if (Array.isArray(res.data?.data)) setRefCodes(res.data.data);
      })
      .catch(() => {});
  }, []);

  const patch = (next: Partial<PropertyFormState>) => {
    setForm((current) => ({ ...current, ...next }));
    setError(null);
  };

  const handlePhotos = (files: FileList | null) => {
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

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
    setPreviews((current) => current.filter((_, i) => i !== index));
  };

  const searchRef = async () => {
    try {
      const res = await api.get<ApiResponse<RefCodeItem[]>>('/api/v1/employees/ref-codes', {
        params: { q: form.refSearch }
      });
      if (Array.isArray(res.data?.data)) setRefCodes(res.data.data);
    } catch {
      setError('Could not search reference codes.');
    }
  };

  const goToStep = (next: PropertyStep) => {
    setStep(next);
    setError(null);
    // Bring the top of the form back into view (matters most on phones)
    document.querySelector('.post-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const continueStep = () => {
    const message = validatePropertyStep(form, step);
    if (message) {
      setError(message);
      return;
    }
    if (step < 4) goToStep((step + 1) as PropertyStep);
  };

  const submit = async () => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    for (const s of [1, 2, 3] as PropertyStep[]) {
      const message = validatePropertyStep(form, s);
      if (message) {
        goToStep(s);
        setError(message);
        return;
      }
    }
    const price = propertyPriceNumber(form);
    setLoading(true);
    setError(null);
    try {
      const location = [form.locality, form.city, form.state].filter(Boolean).join(', ');
      const fd = new FormData();
      fd.append('title', listingTitle(form));
      fd.append('location', location);
      fd.append('price', String(price));
      fd.append('description', form.description.trim());
      fd.append('owner_name', form.name.trim());
      fd.append('owner_role', canonicalPosterRole(form.posterRole));
      if (form.refCode.trim()) fd.append('reference_code', form.refCode.trim());
      fd.append('form_data', JSON.stringify({
        kind: role,
        ...form,
        price
      }));
      photos.forEach((photo) => fd.append('photos', photo));
      const res = await api.post<ApiResponse<Listing>>('/api/v1/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.status === 'success' && res.data.data) {
        setSuccessListing(res.data.data);
      } else {
        setError('Listing could not be saved. Please check the form.');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to post listing. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <section className="page-hero green-hero">
          <div className="container">
            <h1><i className="fas fa-plus-circle"></i> Post a Listing</h1>
            <p>Reach thousands of buyers and tenants for FREE</p>
          </div>
        </section>
        <section style={{ background: '#f4f6f9', minHeight: '60vh', padding: '40px 20px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', margin: '0 auto' }}>
            <div style={{ fontSize: 56, color: '#0c6253', marginBottom: 16 }}><i className="fas fa-lock"></i></div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Post a Listing</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Please sign in to access this feature.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" onClick={onOpenAuth}><i className="fas fa-sign-in-alt"></i> Sign In / Register</button>
              <button type="button" className="btn-outline" onClick={() => onNavigate('home')}>Home</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (successListing) {
    return (
      <div style={{ background: '#f4f6f9', minHeight: '65vh', padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 520, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 56, color: '#0c6253', marginBottom: 16 }}><i className="fas fa-check-circle"></i></div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Listing Submitted Successfully!</h2>
          <p style={{ color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
            Your listing <strong>{successListing.title}</strong> has been saved and is waiting for approval.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button type="button" className="btn-primary" onClick={() => onNavigate('listing-detail', successListing)}>View Listing</button>
            <button type="button" className="btn-outline" onClick={() => onNavigate('account')}>My Account</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="page-hero green-hero">
        <div className="container">
          <h1><i className="fas fa-plus-circle"></i> Post a Listing</h1>
          <p>Reach thousands of buyers and tenants for FREE</p>
        </div>
      </section>
      <section className="post-section">
        <div className="post-wrap" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 30px rgba(0,0,0,.08)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#111827' }}>Add New Listing</h2>
          <p className="sub" style={{ color: '#6b7280', marginBottom: 22, fontSize: 14 }}>
            Logged in as {user.name}. Submit for approval.
          </p>
          <div className="form-group">
            <label>Select Role</label>
            <select
              required
              disabled={(role === 'business' ? businessStep : step) > 1}
              title={(role === 'business' ? businessStep : step) > 1 ? 'Role can only be changed on the first step' : undefined}
              value={role}
              onChange={(e) => {
                const next = e.target.value as ListingRole;
                setRole(next);
                setStep(1);
                setBusinessStep(1);
                setError(null);
                if (next === 'buyer') {
                  setForm((current) => ({
                    ...current,
                    posterRole: 'real_buyer',
                    forWhat: 'rent'
                  }));
                } else if (next === 'owner') {
                  setForm((current) => ({
                    ...current,
                    posterRole: 'real_owner',
                    forWhat: 'sale'
                  }));
                }
              }}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontFamily: 'inherit',
                background: '#fff',
                opacity: (role === 'business' ? businessStep : step) > 1 ? 0.7 : 1,
                cursor: (role === 'business' ? businessStep : step) > 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="" disabled>Select Role</option>
              <option value="business">Business Owner</option>
              <option value="buyer">Property - Buyer / Renter</option>
              <option value="owner">Property - Seller / Landlord</option>
            </select>
          </div>

          {(role === 'owner' || role === 'buyer') && (
            <PropertyListingForm
              variant={role === 'buyer' ? 'buyer' : 'owner'}
              step={step}
              form={form}
              cities={cities}
              refCodes={refCodes}
              error={error}
              loading={loading}
              onChange={patch}
              onContinue={continueStep}
              onBack={() => { if (step > 1) goToStep((step - 1) as PropertyStep); }}
              onSearchRef={() => { void searchRef(); }}
              onSelectRef={(item) => setRefCodes((current) =>
                current.some((c) => c.reference_code === item.reference_code) ? current : [item, ...current])}
              onSubmit={() => { void submit(); }}
              photos={photos}
              previews={previews}
              onPhotos={handlePhotos}
              onRemovePhoto={removePhoto}
            />
          )}

          {role === 'business' && (
            <BusinessListingForm
              cities={cities}
              refCodes={refCodes}
              onSuccess={setSuccessListing}
              onStepChange={setBusinessStep}
            />
          )}
        </div>
      </section>
    </>
  );
}
