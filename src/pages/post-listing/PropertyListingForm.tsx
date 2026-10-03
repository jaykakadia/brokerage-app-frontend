import { ExistingPhotos, FloatField, FloatSelect, MultiPills, PhoneWhatsAppFields, Pills, RefCodeSearch, SocialLinkFields, StepIndicator } from './fields';
import { StateOptions } from '../../utils/indianStates';
import {
  amenitiesFor,
  formatInr,
  landAreaFor,
  withAutoPrice,
  stateForCity,
  type CityOption,
  type PropertyFormState,
  type PropType,
  type PropertyStep
} from './propertyForm';
import type { ListingImage, RefCodeItem } from '../../types';

export const PROPERTY_STEPS = [
  { label: 'Contact Details', icon: 'fas fa-address-card' },
  { label: 'Type & Location', icon: 'fas fa-map-marker-alt' },
  { label: 'Property Details', icon: 'fas fa-list-ul' },
  { label: 'Photos & Submit', icon: 'fas fa-camera' }
];

export interface PropertyListingFormProps {
  variant: 'owner' | 'buyer';
  step: PropertyStep;
  form: PropertyFormState;
  cities: CityOption[];
  refCodes: RefCodeItem[];
  error: string | null;
  loading: boolean;
  onChange: (patch: Partial<PropertyFormState>) => void;
  onContinue: () => void;
  onBack: () => void;
  onSearchRef: () => void;
  onSelectRef?: (item: RefCodeItem) => void;
  onSubmit: () => void;
  photos: File[];
  previews: string[];
  onPhotos: (files: FileList | null) => void;
  onRemovePhoto: (index: number) => void;
  /** Edit mode: photos already saved on the listing */
  existingImages?: ListingImage[];
  removedImageIds?: number[];
  onRemoveExisting?: (id: number) => void;
  submitLabel?: string;
  /** Show every section on one page with a single Save button (admin edit) */
  singlePage?: boolean;
}

export default function PropertyListingForm({
  variant,
  step,
  form,
  cities,
  refCodes,
  error,
  loading,
  onChange,
  onContinue,
  onBack,
  onSearchRef,
  onSelectRef,
  onSubmit,
  photos,
  previews,
  onPhotos,
  onRemovePhoto,
  existingImages = [],
  removedImageIds = [],
  onRemoveExisting,
  submitLabel = 'Submit Listing',
  singlePage = false
}: PropertyListingFormProps) {
  const show = (s: PropertyStep): boolean => singlePage || step === s;
  // Plot and agriculture prices follow area x rate
  const changeLand = (patch: Partial<PropertyFormState>) => onChange(withAutoPrice(form, patch));
  const land = landAreaFor(form);
  const rateNumber = Number(form.rate.replace(/\D/g, '')) || 0;
  const rateField = (unit: string) => (
    <>
      <FloatField
        label={`Rate per ${unit} (Rs.)`}
        icon="fas fa-tag"
        inputMode="numeric"
        value={form.rate}
        onChange={(value) => changeLand({ rate: formatInr(value) })}
      />
      {land && land.area > 0 && rateNumber > 0 ? (
        <div className="rate-calc">
          <i className="fas fa-calculator"></i>
          {land.area} {land.unit} × ₹{form.rate} = <strong>₹{formatInr(String(Math.round(land.area * rateNumber)))}</strong>
        </div>
      ) : null}
      <FloatField
        label="Total Price (Rs.)"
        icon="fas fa-rupee-sign"
        inputMode="numeric"
        value={form.price}
        onChange={(value) => onChange({ price: formatInr(value) })}
      />
      <div className="rate-hint">Auto-calculated from area × rate. You can still edit it.</div>
    </>
  );

  const amenityOptions = amenitiesFor(form.propType);
  const amenitiesField = amenityOptions.length > 0 ? (
    <MultiPills
      label="Amenities"
      values={form.amenities.filter((a) => amenityOptions.includes(a))}
      options={amenityOptions}
      onChange={(amenities) => onChange({ amenities })}
    />
  ) : null;

  const priceField = (
    <div style={{ marginTop: 16 }}>
      <FloatField
        label="Price/ Budget (Rs.)"
        icon="fas fa-rupee-sign"
        inputMode="numeric"
        value={form.price}
        onChange={(value) => onChange({ price: formatInr(value) })}
      />
    </div>
  );

  const frontRoadField = (
    <>
      <Pills label="Front Road" value={form.frontRoad} onChange={(frontRoad) => onChange({ frontRoad })} options={[
        { value: 'No', label: 'No' },
        { value: 'Yes', label: 'Yes' }
      ]} />
      {form.frontRoad === 'Yes' ? (
        <FloatField
          label="Road Width (in Ft)"
          icon="fas fa-road"
          inputMode="decimal"
          value={form.roadWidth}
          onChange={(value) => onChange({ roadWidth: value.replace(/[^\d.]/g, '') })}
        />
      ) : null}
    </>
  );

  const facingPills = (
    <Pills label="Facing" value={form.facing} onChange={(facing) => onChange({ facing })} options={[
      { value: 'East', label: 'East' },
      { value: 'West', label: 'West' },
      { value: 'North', label: 'North' },
      { value: 'South', label: 'South' }
    ]} />
  );

  const setCity = (city: string) => {
    onChange({ city, state: stateForCity(city, cities) });
  };

  return (
    <div className="business-premium-box">
      {singlePage ? null : <StepIndicator steps={PROPERTY_STEPS} current={step} />}
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
          {error}
        </div>
      ) : null}

      {show(1) && (
        <>
          <div className="bf-heading"><i className="fas fa-address-card"></i> Contact Details</div>
          <FloatField label="Your Name" icon="fas fa-user" required value={form.name} onChange={(name) => onChange({ name })} />
          <div style={{ marginTop: 16 }}>
            <FloatField label="Business Name" icon="fas fa-briefcase" value={form.businessName} onChange={(businessName) => onChange({ businessName })} />
          </div>
          <div style={{ marginTop: 16 }}>
            <PhoneWhatsAppFields mobile={form.mobile} whatsapp={form.whatsapp} sameAsMobile={form.sameAsMobile} onChange={onChange} />
          </div>
          <FloatField label="Email ID" icon="fas fa-envelope" required type="email" value={form.email} onChange={(email) => onChange({ email })} />
          <SocialLinkFields facebookUrl={form.facebookUrl} websiteUrl={form.websiteUrl} xUrl={form.xUrl} onChange={onChange} />

          {singlePage ? null : (
            <div className="bf-actions">
              <button type="button" className="btn-premium" onClick={onContinue}>Next <i className="fas fa-arrow-right"></i></button>
            </div>
          )}
        </>
      )}

      {show(2) && (
        <>
          <div className="bf-heading"><i className="fas fa-home"></i> Property Type &amp; Location</div>
          <Pills
            label="You Are"
            value={form.posterRole}
            onChange={(posterRole) => onChange({ posterRole })}
            options={variant === 'buyer'
              ? [
                  { value: 'real_buyer', label: 'Real Buyer/Renter' },
                  { value: 'agent', label: 'Agent' }
                ]
              : [
                  { value: 'real_owner', label: 'Real Owner' },
                  { value: 'agent', label: 'Agent' },
                  { value: 'builder', label: 'Builder' }
                ]}
          />
          <Pills
            label="Property For"
            value={form.forWhat}
            onChange={(forWhat) => onChange({ forWhat })}
            options={variant === 'buyer'
              ? [
                  { value: 'sale', label: 'Buy' },
                  { value: 'rent', label: 'Rent/Lease' }
                ]
              : [
                  { value: 'sale', label: 'Sale' },
                  { value: 'rent', label: 'Rent/Lease' }
                ]}
          />
          <div style={{ marginTop: 8 }}>
            <FloatSelect label="Select Property Type" icon="fas fa-building" required value={form.propType} onChange={(propType) => onChange({ propType: propType as PropType })}>
              <option value="flat">Flat / Builder Floor / House / Villa</option>
              <option value="plot">Plot</option>
              <option value="agriculture">Agriculture Land</option>
              <option value="commercial">Commercial - Shop/ Showroom/ Warehouse</option>
              <option value="pg">PG/ Guest House</option>
            </FloatSelect>
          </div>

          <div className="bf-heading" style={{ marginTop: 24, fontSize: 16 }}><i className="fas fa-map-marker-alt"></i> Property Location</div>
          <div className="bf-row keep-row">
            <FloatSelect label="City" required value={form.city} onChange={setCity}>
              {cities.map((item) => (
                <option key={item.city} value={item.city}>{item.city}</option>
              ))}
            </FloatSelect>
            <FloatSelect label="State" required value={form.state} onChange={(state) => onChange({ state })}>
              <StateOptions current={form.state} />
            </FloatSelect>
          </div>
          <FloatField label="Locality / Project / Society" value={form.locality} onChange={(locality) => onChange({ locality })} />

          <div className="ref-code-box" style={{ marginTop: 18, padding: 14, border: '1.5px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc' }}>
            <div className="bf-heading" style={{ marginBottom: 12, fontSize: 15 }}><i className="fas fa-id-badge"></i> Reference Code</div>
            <div className="bf-row" style={{ marginBottom: 0, alignItems: 'flex-end' }}>
              <div className="premium-float" style={{ flex: 2, marginBottom: 0 }}>
                <select
                  className={`premium-select${form.refCode ? ' is-filled' : ''}`}
                  style={{ paddingLeft: 12 }}
                  value={form.refCode}
                  onChange={(e) => onChange({ refCode: e.target.value })}
                >
                  <option value="">Select Ref Code</option>
                  {refCodes.map((item) => (
                    <option key={item.reference_code} value={item.reference_code}>
                      {item.reference_code} — {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <RefCodeSearch
                  value={form.refSearch}
                  onChange={(refSearch) => onChange({ refSearch })}
                  onSelect={(item) => { onSelectRef?.(item); onChange({ refCode: item.reference_code, refSearch: item.name }); }}
                />
              </div>
              <button type="button" className="btn-outline" style={{ flex: 1, marginTop: 0, padding: 12 }} onClick={onSearchRef}>
                <i className="fas fa-search"></i> Search
              </button>
            </div>
          </div>

          {singlePage ? null : (
            <div className="bf-actions">
              <button type="button" className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button>
              <button type="button" className="btn-premium" onClick={onContinue}>Next <i className="fas fa-arrow-right"></i></button>
            </div>
          )}
        </>
      )}

      {show(3) && (
        <>
          <div className="bf-heading"><i className="fas fa-list-ul"></i> Property Details</div>
          {(form.propType === 'flat' || form.propType === 'house') && (
            <>
              <Pills label="BHK" value={form.bhk} onChange={(bhk) => onChange({ bhk })} options={[
                { value: '1BHK', label: '1BHK' },
                { value: '2BHK', label: '2BHK' },
                { value: '3BHK', label: '3BHK' },
                { value: '3BHK+', label: '3BHK+' }
              ]} />
              <Pills label="Bathroom (Available/Required)" value={form.bath} onChange={(bath) => onChange({ bath })} options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' }
              ]} />
              <Pills label="Furnish Type" value={form.furnish} onChange={(furnish) => onChange({ furnish })} options={[
                { value: 'Furnished', label: 'Furnished' },
                { value: 'Semi-Furnished', label: 'Semi-Furnished' },
                { value: 'Un-Furnished', label: 'Un-Furnished' }
              ]} />
              {amenitiesField}
              {frontRoadField}
              {facingPills}
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Built-up Area / Area" inputMode="decimal" value={form.area} onChange={(value) => changeLand({ area: value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1') })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.unit} onChange={(unit) => changeLand({ unit })}>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Yd">Sq.Yd</option>
                    <option value="Sq.Mtr">Sq.Mtr</option>
                  </FloatSelect>
                </div>
              </div>
              {rateField(form.unit)}
            </>
          )}

          {form.propType === 'plot' && (
            <>
              {frontRoadField}
              {facingPills}
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Area" inputMode="decimal" value={form.plotArea} onChange={(value) => changeLand({ plotArea: value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1') })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.plotUnit} onChange={(plotUnit) => changeLand({ plotUnit })}>
                    <option value="Sq.Yd">Sq.Yd</option>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Mtr">Sq.Mtr</option>
                  </FloatSelect>
                </div>
              </div>
              {rateField(form.plotUnit)}
            </>
          )}

          {form.propType === 'agriculture' && (
            <>
              {frontRoadField}
              {facingPills}
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Area" inputMode="decimal" value={form.agriArea} onChange={(value) => changeLand({ agriArea: value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1') })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.agriUnit} onChange={(agriUnit) => changeLand({ agriUnit })}>
                    <option value="Acre">Acre</option>
                    <option value="Bigha">Bigha</option>
                    <option value="Hectare">Hectare</option>
                    <option value="Sq.Yd">Sq.Yd</option>
                  </FloatSelect>
                </div>
              </div>
              {rateField(form.agriUnit)}
            </>
          )}

          {form.propType === 'commercial' && (
            <>
              {amenitiesField}
              {frontRoadField}
              {facingPills}
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Total Area" value={form.totalArea} onChange={(totalArea) => onChange({ totalArea })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.totalUnit} onChange={(totalUnit) => onChange({ totalUnit })}>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Yd">Sq.Yd</option>
                    <option value="Sq.Mtr">Sq.Mtr</option>
                  </FloatSelect>
                </div>
              </div>
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Built-up Area" value={form.builtArea} onChange={(builtArea) => onChange({ builtArea })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.builtUnit} onChange={(builtUnit) => onChange({ builtUnit })}>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Yd">Sq.Yd</option>
                    <option value="Sq.Mtr">Sq.Mtr</option>
                  </FloatSelect>
                </div>
              </div>
              {priceField}
              <div style={{ marginTop: 16 }}>
                <FloatSelect label="Possession Info." icon="fas fa-key" required value={form.possession} onChange={(possession) => onChange({ possession })}>
                  <option value="Ready to Move">Ready to Move</option>
                  <option value="Under Construction">Under Construction</option>
                </FloatSelect>
              </div>
            </>
          )}

          {form.propType === 'pg' && (
            <>
              <div style={{ marginTop: 16 }}>
                <FloatField label="Total Beds" icon="fas fa-bed" type="number" value={form.totalBeds} onChange={(totalBeds) => onChange({ totalBeds })} />
              </div>
              <Pills label="PG For" value={form.pgFor} onChange={(pgFor) => onChange({ pgFor })} options={[
                { value: 'Boys', label: 'Boys' },
                { value: 'Girls', label: 'Girls' },
                { value: 'Anyone', label: 'Anyone' }
              ]} />
              <Pills label="Furnish Type" value={form.pgFurnish} onChange={(pgFurnish) => onChange({ pgFurnish })} options={[
                { value: 'Furnished', label: 'Furnished' },
                { value: 'Semi-Furnished', label: 'Semi-Furnished' }
              ]} />
              <FloatField label="Common Areas (e.g. Lounge, Dining)" icon="fas fa-couch" value={form.commonAreas} onChange={(commonAreas) => onChange({ commonAreas })} />
              <Pills label="Meals Available" value={form.pgMeals} onChange={(pgMeals) => onChange({ pgMeals })} options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' }
              ]} />
              <Pills label="Room Type" value={form.pgRoomType} onChange={(pgRoomType) => onChange({ pgRoomType })} options={[
                { value: 'Single', label: 'Single' },
                { value: 'Double', label: 'Double' },
                { value: 'Triple', label: 'Triple+' }
              ]} />
              {amenitiesField}
              {frontRoadField}
            </>
          )}

          {!land && form.propType !== 'commercial' ? priceField : null}

          {singlePage ? null : (
            <div className="bf-actions">
              <button type="button" className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button>
              <button type="button" className="btn-premium" onClick={onContinue}>Next <i className="fas fa-arrow-right"></i></button>
            </div>
          )}
        </>
      )}

      {show(4) && (
        <>
          <div className="bf-heading"><i className="fas fa-camera"></i> Photos &amp; Description</div>
          <div className="upload-area" onClick={() => document.getElementById('ownerPhotos')?.click()} style={{ marginBottom: 16 }}>
            <i className="fas fa-cloud-upload-alt upload-icon"></i>
            <div className="upload-title">Click to Add Property Photos</div>
            <input id="ownerPhotos" type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => onPhotos(e.target.files)} />
          </div>
          {onRemoveExisting ? (
            <ExistingPhotos images={existingImages} removedIds={removedImageIds} onRemove={onRemoveExisting} />
          ) : null}
          {previews.length > 0 ? (
            <div className="thumbnails-container" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {previews.map((src, index) => (
                <div key={src} style={{ position: 'relative', width: 84, height: 84 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button type="button" onClick={() => onRemovePhoto(index)} style={{ position: 'absolute', top: 4, right: 4, border: 'none', borderRadius: '50%', width: 20, height: 20, background: '#dc2626', color: '#fff', cursor: 'pointer' }}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {photos.length > 0 ? <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{photos.length} photo{photos.length === 1 ? '' : 's'} selected</div> : null}

          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            maxLength={4000}
            placeholder="Enter property description (max 400 words)..."
            onChange={(e) => onChange({ description: e.target.value })}
            style={{ width: '100%', padding: 14, border: '1.5px solid #e2e8f0', borderRadius: 10, fontFamily: 'inherit', resize: 'vertical', minHeight: 100, marginBottom: 16, outline: 'none' }}
          />

          {singlePage && error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
              {error}
            </div>
          ) : null}
          <div className="bf-actions">
            {singlePage ? null : <button type="button" className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button>}
            <button type="button" className="btn-premium" disabled={loading} onClick={onSubmit}>
              {loading ? 'Saving...' : <>{submitLabel} <i className="fas fa-check"></i></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
