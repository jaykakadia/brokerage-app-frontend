import { useEffect, useState } from 'react';
import api, { getApiErrorMessage, getRefCodes } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PropertyListingForm from './PropertyListingForm';
import BusinessListingForm from './BusinessListingForm';
import { scrollFormToTop } from './fields';
import {
  canonicalPosterRole,
  amenitiesFor,
  normalizedSocialLinks,
  profileContactDefaults,
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
} from './propertyForm';
import type { Listing, Location, ApiResponse, RefCodeItem } from '../../types';

const LISTING_ROLES: ListingRole[] = ['business', 'buyer', 'owner'];

const listingRoleOf = (listing: Listing): ListingRole | '' => {
  const kind = listing.form_data?.kind;
  return LISTING_ROLES.includes(kind as ListingRole) ? (kind as ListingRole) : '';
};

/** Rebuilds the wizard form from a saved property listing (edit mode). */
function propertyFormFromListing(listing: Listing): PropertyFormState {
  const saved = (listing.form_data || {}) as Record<string, unknown>;
  const next = { ...EMPTY_PROPERTY_FORM } as unknown as Record<string, unknown>;
  for (const key of Object.keys(EMPTY_PROPERTY_FORM)) {
    const value = saved[key];
    if (value === undefined || value === null) continue;
    // price is saved as a number but edited as text
    next[key] = key === 'price' ? String(value) : value;
  }
  const form = next as unknown as PropertyFormState;
  return {
    ...form,
    name: form.name || listing.owner_name,
    description: form.description || listing.description || '',
    refCode: form.refCode || listing.reference_code || '',
    refSearch: ''
  };
}

export interface ListingWizardProps {
  /** Edit mode: open the full form filled with this listing and save changes to it */
  editListing?: Listing | null;
  onSaved: (listing: Listing) => void;
  onRequireAuth?: () => void;
  /** Show every section of the form on one page (admin edit) */
  singlePage?: boolean;
  /** Let the listing type of a saved listing be changed (admin edit) */
  allowTypeChange?: boolean;
}

export default function ListingWizard({ editListing = null, onSaved, onRequireAuth, singlePage = false, allowTypeChange = false }: ListingWizardProps) {
  const { user } = useAuth();
  const [role, setRole] = useState<ListingRole | ''>(() => (editListing ? listingRoleOf(editListing) : ''));
  const [step, setStep] = useState<PropertyStep>(1);
  const [businessStep, setBusinessStep] = useState(1);
  const [form, setForm] = useState<PropertyFormState>(() => (editListing ? propertyFormFromListing(editListing) : EMPTY_PROPERTY_FORM));
  const [cities, setCities] = useState<CityOption[]>(FALLBACK_CITIES);
  const [refCodes, setRefCodes] = useState<RefCodeItem[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignEmail, setAssignEmail] = useState('');
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    // When editing, the form holds the saved listing, not the signed-in user's profile
    if (!user || editListing) return;
    const profile = profileContactDefaults(user);
    setForm((current) => ({
      ...current,
      name: current.name || user.name || '',
      businessName: current.businessName || user.business_name || '',
      // Only take the profile's phone/WhatsApp pair if the user hasn't typed a mobile yet
      ...(current.mobile ? {} : { mobile: profile.mobile, whatsapp: profile.whatsapp, sameAsMobile: profile.sameAsMobile }),
      email: current.email || user.email || '',
      facebookUrl: current.facebookUrl || profile.facebookUrl,
      websiteUrl: current.websiteUrl || profile.websiteUrl,
      xUrl: current.xUrl || profile.xUrl,
      youtubeUrl: current.youtubeUrl || profile.youtubeUrl
    }));
  }, [user, editListing]);

  useEffect(() => {
    api.get<ApiResponse<Location[]>>('/api/v1/locations')
      .then((res) => {
        const rows = res.data?.data;
        if (!Array.isArray(rows) || rows.length === 0) return;
        const next = rows
          .filter((row) => row.city_name)
          .map((row) => ({ city: row.city_name, state: row.state || stateForCity(row.city_name, FALLBACK_CITIES) }));
        // Same-named towns in different states are kept apart; A-Z for the City picker
        const unique = Array.from(new Map(next.map((item) => [`${item.city.toLowerCase()}|${item.state}`, item])).values())
          .sort((a, b) => a.city.localeCompare(b.city, 'en', { sensitivity: 'base' }) || a.state.localeCompare(b.state));
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
    scrollFormToTop();
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
      onRequireAuth?.();
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
      if (assignEmail.trim()) fd.append('assign_to_email', assignEmail.trim());
      if (editListing) {
        // Always sent when editing so a cleared code is saved too
        fd.append('reference_code', form.refCode.trim());
        if (removedImageIds.length) fd.append('remove_image_ids', removedImageIds.join(','));
      } else if (form.refCode.trim()) {
        fd.append('reference_code', form.refCode.trim());
      }
      fd.append('form_data', JSON.stringify({
        kind: role,
        ...form,
        whatsapp: form.sameAsMobile ? form.mobile : form.whatsapp,
        ...normalizedSocialLinks(form),
        amenities: form.amenities.filter((a) => amenitiesFor(form.propType).includes(a)),
        price
      }));
      photos.forEach((photo) => fd.append('photos', photo));
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const res = editListing
        ? await api.patch<ApiResponse<Listing>>(`/api/v1/listings/${editListing.id}`, fd, config)
        : await api.post<ApiResponse<Listing>>('/api/v1/listings', fd, config);
      if (res.data?.status === 'success' && res.data.data) {
        onSaved(res.data.data);
      } else {
        setError('Listing could not be saved. Please check the form.');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, editListing ? 'Failed to save listing. Please try again.' : 'Failed to post listing. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // A saved listing keeps its type (unless an admin is editing); only listings saved without one let the type be picked
  const roleLocked = editListing !== null
    ? !allowTypeChange && listingRoleOf(editListing) !== ''
    : (role === 'business' ? businessStep : step) > 1;
  const typeChanged = editListing !== null && role !== '' && role !== listingRoleOf(editListing);

  // Choices made on step 2, repeated on the later steps so the user doesn't lose track of them
  const choiceSummary = (role === 'owner' || role === 'buyer') && !singlePage && step > 2
    ? [
        role === 'buyer' ? 'Property - Buyer / Renter' : 'Property - Seller / Landlord',
        { real_buyer: 'User', real_owner: 'Real Owner', agent: 'Agent', builder: 'Builder' }[form.posterRole],
        form.forWhat === 'rent' ? 'Rent/Lease' : role === 'buyer' ? 'Buy' : 'Sale',
        { flat: 'Flat / House / Villa', house: 'Flat / House / Villa', plot: 'Plot', agriculture: 'Agriculture Land', commercial: 'Commercial', pg: 'PG / Guest House' }[form.propType as string]
      ].filter(Boolean)
    : null;

  return (
    <>
      <div className={`form-group listing-type-box ${role ? '' : 'needs-choice'}`}>
        <label>Select Listing Type</label>
        {!role && <div className="listing-type-hint"><i className="fas fa-hand-point-down"></i> Start here: choose what you want to list</div>}
        <select
          required
          disabled={roleLocked}
          title={roleLocked ? (editListing ? 'The listing type of a saved listing cannot be changed' : 'Role can only be changed on the first step') : undefined}
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
            opacity: roleLocked ? 0.7 : 1,
            cursor: roleLocked ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="" disabled>Select Listing Type</option>
          <option value="business">Business Owner</option>
          <option value="buyer">Property - Buyer / Renter</option>
          <option value="owner">Property - Seller / Landlord</option>
        </select>
        {choiceSummary && (
          <div className="listing-choice-summary">
            {choiceSummary.map((item, i) => (
              <span key={i} className={i === 0 ? 'is-type' : undefined}>{item}</span>
            ))}
            <button type="button" onClick={() => goToStep(2)}>
              <i className="fas fa-pen"></i> Change
            </button>
          </div>
        )}
        {typeChanged && (
          <div style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>
            <i className="fas fa-info-circle"></i> The listing type changes when you click Save Changes. Fill in any required fields for the new type.
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="form-group">
          <label>Assign to User (email)</label>
          <input
            type="email"
            value={assignEmail}
            onChange={(e) => setAssignEmail(e.target.value)}
            placeholder={editListing ? 'Leave empty to keep the current owner' : 'Leave empty to keep it under your admin account'}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
            <i className="fas fa-info-circle"></i> The listing goes to this user's account. If they haven't signed up yet, it moves to them when they do.
          </div>
          {editListing?.assigned_email && (
            <div style={{ fontSize: 12, color: '#b45309', marginTop: 6 }}>
              <i className="fas fa-clock"></i> Waiting for {editListing.assigned_email} to sign up.
            </div>
          )}
        </div>
      )}

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
          existingImages={editListing?.images}
          removedImageIds={removedImageIds}
          onRemoveExisting={editListing ? (id) => setRemovedImageIds((current) => [...current, id]) : undefined}
          submitLabel={editListing ? 'Save Changes' : 'Submit Listing'}
          singlePage={singlePage}
        />
      )}

      {role === 'business' && (
        <BusinessListingForm
          cities={cities}
          refCodes={refCodes}
          onSuccess={onSaved}
          onStepChange={setBusinessStep}
          editListing={editListing}
          singlePage={singlePage}
          assignEmail={assignEmail}
        />
      )}
    </>
  );
}
