import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../services/api';
import SignupGuide from './SignupGuide';
import { isCanonicalRole, type CanonicalRole, type MessageResponse } from '../types';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: string;
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  onSuccess
}: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Signin fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<CanonicalRole>('Owner');
  const [regOtp, setRegOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  // Show/hide toggles for password fields
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const togglePw = (key: string): void => setShowPw((prev) => ({ ...prev, [key]: !prev[key] }));
  const eyeBtn = (key: string) => (
    <button
      type="button"
      onClick={() => togglePw(key)}
      aria-label={showPw[key] ? 'Hide password' : 'Show password'}
      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px' }}
    >
      <i className={`fas ${showPw[key] ? 'fa-eye-slash' : 'fa-eye'}`} />
    </button>
  );

  const handleForgotSendOtp = async (): Promise<void> => {
    if (!forgotEmail) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/send-otp', {
        email: forgotEmail,
        action: 'forgot'
      });
      setForgotOtpSent(true);
      setSuccessMsg(res.data.message || 'Reset OTP sent to your email.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to send reset OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!forgotOtp) {
      setError('Please enter the OTP received in your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/reset-password', {
        email: forgotEmail,
        otp: forgotOtp,
        new_password: newPassword
      });
      setSuccessMsg(res.data.message || 'Password reset successfully! Please sign in.');
      setTab('signin');
      setLoginEmail(forgotEmail);
      setLoginPassword('');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Password reset failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (): Promise<void> => {
    if (!regEmail) {
      setError('Please enter your email to receive an OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/send-otp', {
        email: regEmail,
        action: 'register',
        name: regName,
        phone: regPhone
      });
      setOtpSent(true);
      setSuccessMsg(res.data.message || 'OTP dispatched to email.');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to send OTP.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(loginEmail, loginPassword);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Sign-in failed. Check credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!otpSent) {
      setError('Please verify your email. Click "Send OTP" and enter the code you receive.');
      return;
    }
    if (!/^\d{6}$/.test(regOtp.trim())) {
      setError('Enter the 6-digit OTP sent to your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({
        name: regName,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
        role: regRole,
        otp: regOtp.trim(),
        business_name: regBusiness.trim() || undefined
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay active"
      style={{ display: 'flex', zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: '440px', width: '100%', textAlign: 'left', padding: '30px', position: 'relative' }}>
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
          style={{ position: 'absolute', top: '16px', right: '16px' }}
        >
          <i className="fas fa-times"></i>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#ecfdf5',
            color: '#0d7a5f',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            marginBottom: '10px',
            border: '1px solid #a7f3d0'
          }}>
            <i className={`fas ${icon || 'fa-user-lock'}`}></i>
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
            {title || (tab === 'signin' ? 'Sign In to Your Account' : tab === 'register' ? 'Create an Account' : 'Reset Password')}
          </h3>
          <p style={{ fontSize: '13.5px', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>
            {subtitle || (tab === 'signin' ? 'Sign in to save properties, view contact info, and manage listings' : 'Join TradeCall India to list and browse verified properties')}
          </p>
        </div>

        <div className="auth-tabs" style={{ display: 'flex', border: '1.5px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
          <button
            type="button"
            className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
            onClick={() => { setTab('signin'); setError(''); }}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, background: tab === 'signin' ? '#0c6253' : '#fff', color: tab === 'signin' ? '#fff' : '#4b5563' }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, background: tab === 'register' ? '#0c6253' : '#fff', color: tab === 'register' ? '#fff' : '#4b5563' }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}
        {successMsg && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
            <i className="fas fa-check-circle"></i> {successMsg}
          </div>
        )}

        {tab === 'signin' ? (
          <form onSubmit={handleSignIn}>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Email Address</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setTab('forgot'); setError(''); setSuccessMsg(''); }}
                  style={{ background: 'none', border: 'none', color: '#0c6253', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.login ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '10px 38px 10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
                />
                {eyeBtn('login')}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-signin"
              style={{ width: '100%', padding: '12px', background: '#0c6253', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : tab === 'forgot' ? (
          <form onSubmit={handleResetPassword}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '14px' }}>Reset Your Password</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={() => void handleForgotSendOtp()}
                  disabled={loading}
                  style={{ padding: '0 12px', background: '#f0fdf4', color: '#0c6253', border: '1px solid #0c6253', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Send OTP
                </button>
              </div>
            </div>

            {forgotOtpSent && (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Enter 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  placeholder="123456"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>New Password (min 6 chars)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.newPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '9px 38px 9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
                />
                {eyeBtn('newPw')}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: '#0c6253', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginBottom: '10px' }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => { setTab('signin'); setError(''); }}
              style={{ width: '100%', padding: '10px', background: 'transparent', color: '#6b7280', border: 'none', fontSize: '13px', cursor: 'pointer' }}
            >
              &larr; Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <SignupGuide />
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Your Role</label>
              <select
                value={regRole}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isCanonicalRole(val)) setRegRole(val);
                }}
                style={{ width: '100%', padding: '9px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
              >
                <option value="Owner">User</option>
                <option value="Agent">Agent</option>
                <option value="Builder">Builder</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                Business Name <span style={{ color: '#9ca3af', fontWeight: 500 }}>(optional)</span>
              </label>
              <input
                type="text"
                maxLength={150}
                value={regBusiness}
                onChange={(e) => setRegBusiness(e.target.value)}
                placeholder="e.g. Sharma Properties"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Mobile Number</label>
              <input
                type="tel"
                required
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="e.g. 9992292828"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => { setRegEmail(e.target.value); setOtpSent(false); setRegOtp(''); }}
                  placeholder="name@example.com"
                  style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={loading}
                  style={{ padding: '0 12px', background: '#f0fdf4', color: '#0c6253', border: '1px solid #0c6253', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Send OTP
                </button>
              </div>
            </div>

            {otpSent && (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Enter 6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Password (min 6 chars)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw.reg ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '9px 38px 9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '8px' }}
                />
                {eyeBtn('reg')}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-signin"
              style={{ width: '100%', padding: '12px', background: '#0c6253', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
