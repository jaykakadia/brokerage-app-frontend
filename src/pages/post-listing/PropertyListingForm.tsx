import { FloatField, FloatSelect, Pills, RefCodeSearch, StepIndicator } from './fields';
import {
  digitsOnly,
  formatInr,
  stateForCity,
  type CityOption,
  type PropertyFormState,
  type PropType,
  type PropertyStep
} from './propertyForm';
import type { RefCodeItem } from '../../types';

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
  onRemovePhoto
}: PropertyListingFormProps) {
  const setCity = (city: string) => {
    onChange({ city, state: stateForCity(city, cities) });
  };

  return (
    <div className="business-premium-box">
      <StepIndicator steps={PROPERTY_STEPS} current={step} />
      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
          {error}
        </div>
      ) : null}

      {step === 1 && (
        <>
          <div className="bf-heading"><i className="fas fa-address-card"></i> Contact Details</div>
          <FloatField label="Your Name" icon="fas fa-user" required value={form.name} onChange={(name) => onChange({ name })} />
          <div style={{ marginTop: 16 }}>
            <FloatField label="Business Name" icon="fas fa-briefcase" value={form.businessName} onChange={(businessName) => onChange({ businessName })} />
          </div>
          <div style={{ marginTop: 16 }}>
            <FloatField
              label="Mobile Number"
              prefix="+91"
              required
              type="tel"
              inputMode="tel"
              maxLength={10}
              value={form.mobile}
              onChange={(value) => onChange({ mobile: digitsOnly(value, 10) })}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <FloatField label="Email ID" icon="fas fa-envelope" required type="email" value={form.email} onChange={(email) => onChange({ email })} />
          </div>

          <div className="bf-actions">
            <button type="button" className="btn-premium" onClick={onContinue}>Next <i className="fas fa-arrow-right"></i></button>
          </div>
        </>
      )}

      {step === 2 && (
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
              <option value="flat">Flat/ Builder Floor</option>
              <option value="house">House/ Villa</option>
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
            <FloatField label="State" required readOnly value={form.state} onChange={() => undefined} />
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

          <div className="bf-actions">
            <button type="button" className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button>
            <button type="button" className="btn-premium" onClick={onContinue}>Next <i className="fas fa-arrow-right"></i></button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="bf-heading"><i className="fas fa-list-ul"></i> Property Details</div>
          {(form.propType === 'flat' || form.propType === 'house') && (
            <>
              <div style={{ marginTop: 16 }}>
                <FloatField label="Society / (Optional)" value={form.society} onChange={(society) => onChange({ society })} />
              </div>
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
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Built-up Area / Area" value={form.area} onChange={(area) => onChange({ area })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.unit} onChange={(unit) => onChange({ unit })}>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Yd">Sq.Yd</option>
                    <option value="Sq.Mtr">Sq.Mtr</option>
                  </FloatSelect>
                </div>
              </div>
              <Pills label="Furnish Type" value={form.furnish} onChange={(furnish) => onChange({ furnish })} options={[
                { value: 'Furnished', label: 'Furnished' },
                { value: 'Semi-Furnished', label: 'Semi-Furnished' },
                { value: 'Un-Furnished', label: 'Un-Furnished' }
              ]} />
            </>
          )}

          {form.propType === 'plot' && (
            <>
              <div style={{ marginTop: 16 }}>
                <FloatField label="Society / (Optional)" value={form.society} onChange={(society) => onChange({ society })} />
              </div>
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Area" value={form.plotArea} onChange={(plotArea) => onChange({ plotArea })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.plotUnit} onChange={(plotUnit) => onChange({ plotUnit })}>
                    <option value="Sq.Yd">Sq.Yd</option>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Mtr">Sq.Mtr</option>
                  </FloatSelect>
                </div>
              </div>
            </>
          )}

          {form.propType === 'agriculture' && (
            <>
              <div className="bf-row keep-row">
                <div style={{ flex: 2 }}><FloatField label="Area" value={form.agriArea} onChange={(agriArea) => onChange({ agriArea })} /></div>
                <div style={{ flex: 1 }}>
                  <FloatSelect label="Unit" value={form.agriUnit} onChange={(agriUnit) => onChange({ agriUnit })}>
                    <option value="Acre">Acre</option>
                    <option value="Bigha">Bigha</option>
                    <option value="Hectare">Hectare</option>
                    <option value="Sq.Yd">Sq.Yd</option>
                  </FloatSelect>
                </div>
              </div>
              <Pills label="Front Road" value={form.frontRoad} onChange={(frontRoad) => onChange({ frontRoad })} options={[
                { value: 'No', label: 'No' },
                { value: 'Yes', label: 'Yes' }
              ]} />
              {form.frontRoad === 'Yes' ? (
                <FloatField label="If Yes (Road Width in Ft)" value={form.roadWidth} onChange={(roadWidth) => onChange({ roadWidth })} />
              ) : null}
            </>
          )}

          {form.propType === 'commercial' && (
            <>
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
              <div style={{ marginTop: 16 }}>
                <FloatSelect label="Possession Info." required value={form.possession} onChange={(possession) => onChange({ possession })}>
                  <option value="Ready to Move">Ready to Move</option>
                  <option value="Under Construction">Under Construction</option>
                </FloatSelect>
              </div>
              <div style={{ marginTop: 16 }}>
                <FloatField label="Front Road (Ft)" value={form.frontRoadFt} onChange={(frontRoadFt) => onChange({ frontRoadFt })} />
              </div>
            </>
          )}

          {form.propType === 'pg' && (
            <>
              <div style={{ marginTop: 16 }}>
                <FloatField label="Society / (Optional)" value={form.society} onChange={(society) => onChange({ society })} />
              </div>
              <div style={{ marginTop: 16 }}>
                <FloatField label="PG Name" value={form.pgName} onChange={(pgName) => onChange({ pgName })} />
              </div>
              <div style={{ marginTop: 16 }}>
                <FloatField label="Total Beds" type="number" value={form.totalBeds} onChange={(totalBeds) => onChange({ totalBeds })} />
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
              <FloatField label="Common Areas (e.g. Lounge, Dining)" value={form.commonAreas} onChange={(commonAreas) => onChange({ commonAreas })} />
              <Pills label="Meals Available" value={form.pgMeals} onChange={(pgMeals) => onChange({ pgMeals })} options={[
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' }
              ]} />
              <Pills label="Room Type" value={form.pgRoomType} onChange={(pgRoomType) => onChange({ pgRoomType })} options={[
                { value: 'Single', label: 'Single' },
                { value: 'Double', label: 'Double' },
                { value: 'Triple', label: 'Triple+' }
              ]} />
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <FloatField label="Price/ Budget (Rs.)" inputMode="numeric" value={form.price} onChange={(value) => onChange({ price: formatInr(value) })} />
          </div>
          {form.propType !== 'pg' ? (
            <Pills label="Facing" value={form.facing} onChange={(facing) => onChange({ facing })} options={[
              { value: 'East', label: 'East' },
              { value: 'West', label: 'West' },
              { value: 'North', label: 'North' },
              { value: 'South', label: 'South' }
            ]} />
          ) : null}

          <div className="bf-actions">
            <button type="button" className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button>
            <button type="button" className="btn-premium" onClick={onContinue}>Next <i className="fas fa-arrow-right"></i></button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <div className="bf-heading"><i className="fas fa-camera"></i> Photos &amp; Description</div>
          <div className="upload-area" onClick={() => document.getElementById('ownerPhotos')?.click()} style={{ marginBottom: 16 }}>
            <i className="fas fa-cloud-upload-alt upload-icon"></i>
            <div className="upload-title">Click to Add Property Photos</div>
            <input id="ownerPhotos" type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={(e) => onPhotos(e.target.files)} />
          </div>
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

          <div className="bf-actions">
            <button type="button" className="btn-outline" onClick={onBack}><i className="fas fa-arrow-left"></i> Back</button>
            <button type="button" className="btn-premium" disabled={loading} onClick={onSubmit}>
              {loading ? 'Submitting...' : <>Submit Listing <i className="fas fa-check"></i></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
