import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { normalizeExternalUrl } from '../utils/url';
import type { MessageResponse, User, UserProfileUpdate } from '../types';

export interface EditProfileModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

interface ProfileForm {
  name: string;
  phone: string;
  email: string;
  businessName: string;
  whatsapp: string;
  whatsappSameAsPhone: boolean;
  websiteUrl: string;
  facebookUrl: string;
  xUrl: string;
}

type SocialKey = 'websiteUrl' | 'facebookUrl' | 'xUrl';

// Website is the primary link, so it comes first.
const SOCIAL_FIELDS: Array<{ key: SocialKey; label: string; icon: string; color: string; placeholder: string }> = [
  { key: 'websiteUrl', label: 'Website', icon: 'fas fa-globe', color: '#0c6253', placeholder: 'yourwebsite.com' },
  { key: 'facebookUrl', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2', placeholder: 'facebook.com/yourpage' },
  { key: 'xUrl', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#111827', placeholder: 'x.com/yourhandle' }
];

function formFromUser(user: User): ProfileForm {
  const whatsapp = user.whatsapp || '';
  return {
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    businessName: user.business_name || '',
    whatsapp,
    whatsappSameAsPhone: !whatsapp || whatsapp === user.phone,
    websiteUrl: user.website_url || '',
    facebookUrl: user.facebook_url || '',
    xUrl: user.x_url || ''
  };
}

export default function EditProfileModal({ isOpen, user, onClose, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState<ProfileForm>(() => formFromUser(user));
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(formFromUser(user));
    setOtp('');
    setMessage(null);
  }, [isOpen, user]);

  if (!isOpen) return null;

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const emailChanged = form.email.trim().toLowerCase() !== user.email.toLowerCase();
  const identityChanged = emailChanged
    || form.name.trim() !== user.name
    || form.phone.trim() !== (user.phone || '');

  const sendOtp = async () => {
    const target = form.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setMessage({ type: 'error', text: 'Enter a valid email address before sending the OTP.' });
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/send-otp', {
        email: target,
        action: 'profile_update'
      });
      setMessage({
        type: 'success',
        text: res.data?.message || `OTP sent to ${target}.`
      });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Could not send the OTP.') });
    } finally {
      setSending(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (identityChanged && !/^\d{6}$/.test(otp.trim())) {
      setMessage({ type: 'error', text: 'Changing name, mobile or email needs the 6-digit OTP.' });
      return;
    }

    const whatsapp = form.whatsappSameAsPhone ? form.phone.trim() : form.whatsapp.replace(/\D/g, '');
    if (whatsapp && !/^\d{10}$/.test(whatsapp)) {
      setMessage({ type: 'error', text: 'Enter a valid 10-digit WhatsApp number.' });
      return;
    }

    const links: Partial<Record<SocialKey, string>> = {};
    for (const { key, label } of SOCIAL_FIELDS) {
      const url = normalizeExternalUrl(form[key]);
      if (url === null) {
        setMessage({ type: 'error', text: `Enter a valid ${label} link.` });
        return;
      }
      links[key] = url;
    }

    const payload: UserProfileUpdate = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      business_name: form.businessName.trim(),
      whatsapp,
      website_url: links.websiteUrl,
      facebook_url: links.facebookUrl,
      x_url: links.xUrl
    };
    if (identityChanged) payload.otp = otp.trim();

    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put<MessageResponse>('/api/v1/users/profile', payload);
      setMessage({ type: 'success', text: res.data?.message || 'Profile updated successfully.' });
      await onSaved();
      window.setTimeout(onClose, 700);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to update profile.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-user-edit" style={{ color: '#0c6253', marginRight: 8 }}></i>
            Edit Profile
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={(event) => { void save(event); }} style={{ padding: 22 }}>
          {message ? (
            <div style={{
              background: message.type === 'success' ? '#f0faf6' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#c6f2e2' : '#fecaca'}`,
              color: message.type === 'success' ? '#0c6253' : '#b91c1c',
              padding: '12px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14
            }}>
              {message.text}
            </div>
          ) : null}

          <div className="form-group full">
            <label>Client Name</label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="form-group full">
            <label><i className="fas fa-briefcase" style={{ color: '#0c6253', marginRight: 6 }}></i>Business Name</label>
            <input
              type="text"
              maxLength={150}
              placeholder="e.g. Sharma Properties"
              autoFocus={!user.business_name}
              value={form.businessName}
              onChange={(e) => set('businessName', e.target.value)}
            />
          </div>
          <div className="profile-phone-row">
            <div className="form-group">
              <label><i className="fas fa-phone" style={{ color: '#0c6253', marginRight: 6 }}></i>Mobile No</label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
            </div>
            <div className="form-group">
              <label><i className="fab fa-whatsapp" style={{ color: '#25d366', marginRight: 6 }}></i>WhatsApp No</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="10-digit number"
                value={form.whatsappSameAsPhone ? form.phone : form.whatsapp}
                disabled={form.whatsappSameAsPhone}
                onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={form.whatsappSameAsPhone ? { background: '#f8fafc' } : undefined}
              />
            </div>
          </div>
          <label className="profile-check" style={{ marginTop: -6, marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={form.whatsappSameAsPhone}
              onChange={(e) => set('whatsappSameAsPhone', e.target.checked)}
            />
            WhatsApp number same as mobile number
          </label>
          <div className="form-group full">
            <label><i className="fas fa-envelope" style={{ color: '#0c6253', marginRight: 6 }}></i>Email ID</label>
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>

          <div className="form-group full" style={{ marginBottom: 6 }}>
            <label><i className="fas fa-share-alt" style={{ color: '#0c6253', marginRight: 6 }}></i>Social Links <span style={{ color: '#9ca3af', fontWeight: 500 }}>(optional)</span></label>
          </div>
          {SOCIAL_FIELDS.map(({ key, label, icon, color, placeholder }) => (
            <div className="form-group full" key={key}>
              <label style={{ fontWeight: 600 }}>
                <i className={icon} style={{ color, marginRight: 6, width: 14, textAlign: 'center' }}></i>{label}
                {key === 'websiteUrl' ? <span style={{ color: '#0c6253', fontWeight: 600, fontSize: 12, marginLeft: 6 }}>Primary</span> : null}
              </label>
              <input type="text" inputMode="url" placeholder={placeholder} value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}

          {identityChanged && (
            <div className="form-group full">
              <label>OTP Verification <span className="req">*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn-outline" onClick={() => { void sendOtp(); }} disabled={sending} style={{ whiteSpace: 'nowrap' }}>
                  {sending ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
              <small style={{ color: '#64748b', display: 'block', marginTop: 8 }}>
                {emailChanged
                  ? 'A code is sent to the new email. The address changes only after that code is verified.'
                  : 'Name ya mobile badalne ke liye OTP registered email par jayega.'}
              </small>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Saving...' : identityChanged ? 'Verify OTP & Save' : 'Save Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
