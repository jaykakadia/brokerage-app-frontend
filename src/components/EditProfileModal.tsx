import { useEffect, useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import type { MessageResponse, User } from '../types';

export interface EditProfileModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function EditProfileModal({ isOpen, user, onClose, onSaved }: EditProfileModalProps) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setOtp('');
    setMessage(null);
  }, [isOpen, user]);

  if (!isOpen) return null;

  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();

  const sendOtp = async () => {
    const target = email.trim();
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
    if (!/^\d{6}$/.test(otp.trim())) {
      setMessage({ type: 'error', text: 'Enter the 6-digit OTP. Details are not saved without it.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put<MessageResponse>('/api/v1/users/profile', {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        otp: otp.trim()
      });
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
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 22px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
            <i className="fas fa-user-edit" style={{ color: '#0c6253', marginRight: 8 }}></i>
            Edit Details
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
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group full">
            <label>Mobile No</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="form-group full">
            <label>Email ID</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
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
                : 'OTP registered email par jayega. Bina OTP ke details save nahi hongi.'}
            </small>
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Saving...' : 'Verify OTP & Save Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
