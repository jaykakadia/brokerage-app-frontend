import { useState, useEffect } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isCanonicalRole, type CanonicalRole, type Listing, type ApiResponse, type NavigateFunction } from '../types';

export interface PostListingPageProps {
  onNavigate: NavigateFunction;
  onOpenAuth?: () => void;
}

export default function PostListingPage({ onNavigate, onOpenAuth }: PostListingPageProps) {
  const { user } = useAuth();

  const [cities, setCities] = useState<string[]>([
    'Palwal', 'Faridabad', 'Gurugram', 'Sonipat', 'Panipat', 'Hodal', 'Delhi', 'Noida'
  ]);

  // Form Fields
  const [title, setTitle] = useState('');
  const [propType, setPropType] = useState('flat');
  const [listingType, setListingType] = useState('sale');
  const [price, setPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [city, setCity] = useState('Palwal');
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');
  const [bhk, setBhk] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [area, setArea] = useState('');
  const [furnishing, setFurnishing] = useState('Semi-Furnished');
  const [facing, setFacing] = useState('North-East');
  const [floor, setFloor] = useState('2');
  const [totalFloors, setTotalFloors] = useState('4');
  const [description, setDescription] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerRole, setOwnerRole] = useState<CanonicalRole>('Owner');

  // Photo state
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successListing, setSuccessListing] = useState<Listing | null>(null);

  // Load cities from backend if available
  useEffect(() => {
    api.get<ApiResponse<string[]>>('/api/v1/locations/cities')
      .then((res) => {
        if (res.data?.status === 'success' && Array.isArray(res.data?.data) && res.data.data.length > 0) {
          setCities(res.data.data);
          setCity(res.data.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Prefill user name & role
  useEffect(() => {
    if (user) {
      if (!ownerName) setOwnerName(user.name);
      if (user.role && user.role.toLowerCase() !== 'admin') {
        setOwnerRole(user.role);
      }
    }
  }, [user]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const fileList = e.target.files;
    if (!fileList || !fileList.length) return;
    const files = Array.from(fileList);

    if (photos.length + files.length > 10) {
      alert('You can upload a maximum of 10 photos per listing.');
      return;
    }

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        alert(`File ${f.name} exceeds 5 MB limit.`);
        continue;
      }
      validFiles.push(f);
      validPreviews.push(URL.createObjectURL(f));
    }

    setPhotos([...photos, ...validFiles]);
    setPreviews([...previews, ...validPreviews]);
  };

  const removePhoto = (index: number): void => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    // Title validation (max 50 words)
    const words = title.trim().split(/\s+/);
    if (words.length > 50) {
      setError(`Listing title cannot exceed 50 words (currently ${words.length} words).`);
      return;
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError('Please provide a valid property price.');
      return;
    }

    setLoading(true);

    try {
      const fullLocation = locality ? `${locality}, ${city}` : city;
      const formDataObj = {
        propType,
        listingType,
        priceNegotiable,
        bhk,
        bathrooms,
        area,
        furnishing,
        facing,
        floor,
        totalFloors,
        pincode
      };

      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('location', fullLocation);
      fd.append('price', parseFloat(price).toString());
      fd.append('description', description.trim());
      fd.append('owner_name', (ownerName || user.name).trim());
      fd.append('owner_role', ownerRole);
      if (referenceCode.trim()) {
        fd.append('reference_code', referenceCode.trim());
      }
      fd.append('form_data', JSON.stringify(formDataObj));

      // Append photos
      photos.forEach((photo) => {
        fd.append('photos', photo);
      });

      const res = await api.post<ApiResponse<Listing>>('/api/v1/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.status === 'success' && res.data?.data) {
        setSuccessListing(res.data.data);
      } else {
        setError('Listing could not be saved. Please check the form.');
      }
    } catch (err: unknown) {
      console.error('Post listing error:', err);
      setError(getApiErrorMessage(err, 'Failed to post listing. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // If user not authenticated, show sign-in prompt
  if (!user) {
    return (
      <div style={{ background: '#f4f6f9', minHeight: '65vh', padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '56px', color: '#0c6253', marginBottom: '16px' }}>
            <i className="fas fa-lock"></i>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px' }}>Post a Free Listing</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: '1.5' }}>
            Please sign in or register to publish your property listing for free.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button type="button" className="btn-primary" onClick={onOpenAuth}>
              <i className="fas fa-sign-in-alt"></i> Sign In / Register
            </button>
            <button type="button" className="btn-outline" onClick={() => onNavigate('home')}>
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success view
  if (successListing) {
    return (
      <div style={{ background: '#f4f6f9', minHeight: '65vh', padding: '60px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '56px', color: '#0c6253', marginBottom: '16px' }}>
            <i className="fas fa-check-circle"></i>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px', color: '#111827' }}>
            Listing Submitted Successfully!
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: '1.6' }}>
            Your property <strong>"{successListing.title}"</strong> has been saved.
            {successListing.status === 'pending'
              ? ' It is currently under review by our admin team and will be visible publicly once approved.'
              : ' It is now live on TradeCall India!'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('listing-detail', successListing)}
            >
              View Listing
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => onNavigate('account')}
            >
              My Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f4f6f9', minHeight: '80vh', padding: '40px 15px' }}>
      <section className="page-hero green-hero" style={{ borderRadius: '16px', maxWidth: '880px', margin: '0 auto 30px' }}>
        <div className="container">
          <h1 style={{ color: '#fff' }}><i className="fas fa-plus-circle"></i> Post a Property Listing</h1>
          <p>Reach thousands of buyers &amp; tenants across NCR Haryana for FREE</p>
        </div>
      </section>

      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <div className="post-form-wrap" style={{ background: '#fff', borderRadius: '16px', padding: '36px', boxShadow: '0 4px 25px rgba(0,0,0,0.06)' }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '14px 16px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Basic Information */}
            <div className="form-section-title">1. Basic Property Details</div>
            
            <div className="form-group full">
              <label>Listing Title <span className="req">*</span> (Max 50 words)</label>
              <input
                type="text"
                placeholder="e.g. Spacious 3 BHK Luxury Apartment in Sector 2, Palwal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Listing Purpose <span className="req">*</span></label>
                <div className="radio-group">
                  <label className="radio-opt">
                    <input
                      type="radio"
                      name="listingType"
                      value="sale"
                      checked={listingType === 'sale'}
                      onChange={() => setListingType('sale')}
                    />
                    For Sale
                  </label>
                  <label className="radio-opt">
                    <input
                      type="radio"
                      name="listingType"
                      value="rent"
                      checked={listingType === 'rent'}
                      onChange={() => setListingType('rent')}
                    />
                    For Rent
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Property Category <span className="req">*</span></label>
                <select value={propType} onChange={(e) => setPropType(e.target.value)}>
                  <option value="flat">Flat / Apartment</option>
                  <option value="house">House / Villa / Kothi</option>
                  <option value="plot">Plot / Land</option>
                  <option value="agriculture">Agricultural Land</option>
                  <option value="commercial">Commercial - Shop / Office</option>
                  <option value="pg">PG / Guest House</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Expected Price (₹ in INR) <span className="req">*</span></label>
                <input
                  type="number"
                  placeholder="e.g. 4500000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '20px' }}>
                  <input
                    type="checkbox"
                    checked={priceNegotiable}
                    onChange={(e) => setPriceNegotiable(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0c6253' }}
                  />
                  <span>Price is Negotiable</span>
                </label>
              </div>
            </div>

            {/* Section 2: Location */}
            <div className="form-section-title" style={{ marginTop: '28px' }}>2. Property Location</div>

            <div className="form-row">
              <div className="form-group">
                <label>City <span className="req">*</span></label>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  placeholder="e.g. 121102"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group full">
              <label>Locality / Sector / Society Name <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. HUDA Sector 2, Near City Park"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
              />
            </div>

            {/* Section 3: Specifications */}
            <div className="form-section-title" style={{ marginTop: '28px' }}>3. Property Specifications</div>

            <div className="form-row">
              <div className="form-group">
                <label>Bedrooms (BHK)</label>
                <select value={bhk} onChange={(e) => setBhk(e.target.value)}>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3 BHK</option>
                  <option value="4">4 BHK</option>
                  <option value="5+">5+ BHK</option>
                </select>
              </div>

              <div className="form-group">
                <label>Bathrooms</label>
                <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Super Built-up Area (Sq. Ft.)</label>
                <input
                  type="number"
                  placeholder="e.g. 1450"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Furnishing Status</label>
                <select value={furnishing} onChange={(e) => setFurnishing(e.target.value)}>
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                  <option value="Fully Furnished">Fully Furnished</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Facing Direction</label>
                <select value={facing} onChange={(e) => setFacing(e.target.value)}>
                  <option value="East">East</option>
                  <option value="North">North</option>
                  <option value="North-East">North-East</option>
                  <option value="West">West</option>
                  <option value="South">South</option>
                </select>
              </div>

              <div className="form-group">
                <label>Floor / Total Floors</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Floor No."
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ alignSelf: 'center', color: '#94a3b8' }}>of</span>
                  <input
                    type="text"
                    placeholder="Total Floors"
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Owner & Reference Info */}
            <div className="form-section-title" style={{ marginTop: '28px' }}>4. Contact &amp; Associate Details</div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Person Name <span className="req">*</span></label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Your Role <span className="req">*</span></label>
                <select
                  value={ownerRole}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isCanonicalRole(val)) setOwnerRole(val);
                  }}
                >
                  <option value="Owner">Owner</option>
                  <option value="Agent">Agent</option>
                  <option value="Builder">Builder</option>
                </select>
              </div>
            </div>

            <div className="form-group full">
              <label>Field Associate Reference Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TC-PLW-01"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
              />
              <small style={{ color: '#64748b' }}>
                If a TradeCall field associate or agent assisted you, enter their code here.
              </small>
            </div>

            <div className="form-group full">
              <label>Detailed Description</label>
              <textarea
                rows={4}
                placeholder="Describe key features, nearby landmarks (metro, schools, markets), society amenities, possession status..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            {/* Section 5: Photos Upload */}
            <div className="form-section-title" style={{ marginTop: '28px' }}>5. Upload Photos (Up to 10 photos, max 5 MB each)</div>

            <div
              className="upload-area"
              onClick={() => document.getElementById('photoInput')?.click()}
            >
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Click to select photos or drag &amp; drop</p>
              <span>Allowed formats: JPG, JPEG, PNG, WEBP (Max 5MB each)</span>
              <input
                type="file"
                id="photoInput"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
            </div>

            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', marginTop: '16px' }}>
                {previews.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(220, 38, 38, 0.85)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px'
                      }}
                      title="Remove image"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              style={{ marginTop: '32px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Submitting Listing...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i> Publish Free Listing
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
