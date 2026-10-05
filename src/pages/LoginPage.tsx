import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { getApiErrorMessage } from '../services/api';
import SignupGuide from '../components/SignupGuide';
import { retryAfterSeconds, useResendCooldown } from '../hooks/useResendCooldown';
import type { CanonicalRole, ListingStatsResponse, MessageResponse, NavigateFunction } from '../types';

export interface LoginPageProps {
  initialTab?: 'signin' | 'register' | 'forgot';
  onNavigate?: NavigateFunction;
  onLoginSuccess?: () => void;
}

/* ── Exact CSS copied from tradecall.in/login.php ── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .tc-login-root *, .tc-login-root *::before, .tc-login-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .tc-login-root { font-family: 'Inter', sans-serif; min-height: 100vh; }

  /* WRAP */
  .login-wrap { display: grid; grid-template-columns: 48% 1fr; min-height: 100vh; }

  /* LEFT */
  .login-left {
    background: linear-gradient(320deg,#0a5446 0%,#0c6253 40%,#053d31 100%);
    display: flex; flex-direction: column; padding: 44px 52px; position: relative; overflow: hidden;
  }
  .login-left::before {
    content:''; position:absolute; top:-80px; right:-80px; width:340px; height:340px;
    border-radius:50%; background:rgba(255,255,255,0.05);
  }
  .login-left::after {
    content:''; position:absolute; bottom:-60px; left:-60px; width:260px; height:260px;
    border-radius:50%; background:rgba(255,255,255,0.04);
  }
  .ll-logo { display:flex; align-items:center; gap:8px; margin-bottom:40px; text-decoration:none; color:inherit; width:fit-content; }
  .ll-logo .logo-bars { display:flex; align-items:flex-end; gap:3px; height:28px; }
  .ll-logo .logo-bar { width:6px; border-radius:2px 2px 0 0; background:rgba(255,255,255,0.9); }
  .ll-logo .logo-bar:nth-child(1){height:12px;}
  .ll-logo .logo-bar:nth-child(2){height:19px;}
  .ll-logo .logo-bar:nth-child(3){height:26px;}
  .ll-logo .logo-arrow-sm { width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-bottom:7px solid #f97316; margin-bottom:18px; margin-left:-4px; }
  .ll-logo span { font-size:22px; font-weight:800; color:#fff; }
  .ll-logo span em { color:#f97316; font-style:normal; }
  .ll-heading { font-size:clamp(24px,3vw,36px); font-weight:800; color:#fff; line-height:1.2; margin-bottom:14px; }
  .ll-sub { color:rgba(255,255,255,0.75); font-size:15px; line-height:1.7; margin-bottom:36px; }
  .ll-features { display:flex; flex-direction:column; gap:14px; }
  .ll-feat { display:flex; align-items:center; gap:12px; color:rgba(255,255,255,0.9); font-size:14px; font-weight:500; }
  .ll-feat i { width:22px; color:#5efbca; flex-shrink:0; }
  .ll-stats { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:auto; }
  .ll-stat { background:rgba(255,255,255,0.1); border-radius:12px; padding:14px 16px; }
  .ll-stat .num { font-size:22px; font-weight:800; color:#fff; }
  .ll-stat .lbl { font-size:11px; color:rgba(255,255,255,0.7); margin-top:3px; }
  .ll-footer-txt { font-size:12px; color:rgba(255,255,255,0.45); margin-top:30px; }
  .ll-footer-txt a { color:rgba(255,255,255,0.4); cursor:pointer; text-decoration:none; }
  .ll-footer-txt a:hover { color:rgba(255,255,255,0.75); }

  /* RIGHT */
  .login-right { background:#fff; display:flex; align-items:center; justify-content:center; padding:24px; }
  .login-form-box { width:100%; max-width:420px; }

  /* Tabs */
  .auth-tabs { display:flex; border:1.5px solid #e5e7eb; border-radius:12px; overflow:hidden; margin-bottom:28px; }
  .auth-tab { flex:1; padding:11px; text-align:center; font-size:14px; font-weight:600; color:#6b7280; cursor:pointer; background:#fff; border:none; font-family:inherit; transition:all 0.2s; }
  .auth-tab.active { background:#0c6253; color:#fff; }

  /* Form headings */
  .lf-heading { font-size:22px; font-weight:800; color:#1a1a2e; margin-bottom:5px; }
  .lf-sub { font-size:13px; color:#6b7280; margin-bottom:22px; }

  /* Form elements */
  .form-group { margin-bottom:14px; }
  .form-group label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:5px; }
  .form-group input, .form-group select {
    width:100%; padding:10px 14px; border:1.5px solid #e5e7eb; border-radius:10px;
    font-size:14px; font-family:inherit; outline:none;
    transition:border-color 0.2s,box-shadow 0.2s; background:#f8fafc; color:#111827;
  }
  .form-group input:focus, .form-group select:focus {
    border-color:#0c6253; box-shadow:0 0 0 3px rgba(12,98,83,0.08); background:#fff;
  }
  .forgot-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
  .forgot-row label { display:flex; align-items:center; gap:6px; font-size:13px; color:#374151; cursor:pointer; }
  .forgot-row label input { accent-color:#0c6253; width:auto; }
  .forgot-link { font-size:13px; color:#0c6253; font-weight:600; cursor:pointer; background:none; border:none; font-family:inherit; }
  .btn-signin {
    width:100%; padding:12px;
    background:linear-gradient(135deg,#0c6253,#14a37a);
    color:#fff; border:none; border-radius:10px; font-size:15px; font-weight:700;
    cursor:pointer; font-family:inherit; transition:all 0.2s; margin-bottom:16px;
  }
  .btn-signin:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(12,98,83,0.35); }
  .btn-signin:disabled { opacity:0.7; cursor:not-allowed; transform:none; box-shadow:none; }
  .create-acc { text-align:center; font-size:13px; color:#6b7280; }
  .create-acc a, .create-acc button { color:#0c6253; font-weight:700; cursor:pointer; background:none; border:none; font-size:13px; font-family:inherit; }
  .password-wrap { position:relative; }
  .password-wrap input { padding-right:42px; }
  .toggle-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); cursor:pointer; color:#6b7280; font-size:15px; background:none; border:none; }
  .toggle-eye:hover { color:#0c6253; }

  /* OTP input */
  .otp-input { letter-spacing:6px; text-align:center; font-weight:700; font-size:18px !important; }

  /* Send OTP row */
  .send-otp-row { display:flex; gap:8px; }
  .send-otp-row input { flex:1; }
  .btn-send-otp {
    flex-shrink:0; padding:0 14px; background:#f0fdf4; color:#0c6253;
    border:1px solid #0c6253; border-radius:10px; font-size:12px; font-weight:600;
    cursor:pointer; font-family:inherit; white-space:nowrap;
  }
  .btn-send-otp:disabled { opacity:0.6; cursor:not-allowed; }


  /* Role cards */
  .role-selection { margin-bottom:20px; }
  .role-selection-label { display:block; font-size:14px; font-weight:700; color:#1a1a2e; margin-bottom:12px; }
  .role-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .role-card {
    border:1.5px solid #e5e7eb; border-radius:10px; padding:14px 10px; text-align:center;
    cursor:pointer; transition:all 0.2s; background:#fff;
    display:flex; flex-direction:column; align-items:center;
  }
  .role-card:hover { border-color:#cbd5e1; }
  .role-card.active { border-color:#0c6253; background:#f0faf7; }
  .role-card i { font-size:18px; color:#374151; margin-bottom:8px; }
  .role-card.active i { color:#0c6253; }
  .role-card .rc-title { font-size:12px; font-weight:700; color:#111827; }
  .role-card.active .rc-title { color:#0c6253; }

  /* Alerts */
  .tc-alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .tc-alert.error { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
  .tc-alert.success { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }

  /* Toast */
  .toast-stack { position:fixed; top:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px; max-width:380px; width:calc(100% - 40px); pointer-events:none; }
  .toast { pointer-events:auto; display:flex; align-items:flex-start; gap:12px; background:#fff; border-radius:14px; padding:14px 16px; box-shadow:0 12px 40px rgba(15,23,42,0.16); border:1px solid #e5e7eb; animation:toastIn .28s ease; }
  .toast.hide { animation:toastOut .25s ease forwards; }
  .toast-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:15px; }
  .toast.success .toast-icon { background:#dcfce7; color:#166534; }
  .toast.error .toast-icon { background:#fee2e2; color:#b91c1c; }
  .toast.info .toast-icon { background:#e0f2fe; color:#0369a1; }
  .toast.success { border-color:#bbf7d0; }
  .toast.error { border-color:#fecaca; }
  .toast.info { border-color:#bae6fd; }
  .toast-body { flex:1; min-width:0; }
  .toast-title { font-size:14px; font-weight:700; color:#111827; margin:0 0 2px; }
  .toast-msg { font-size:13px; color:#4b5563; line-height:1.45; margin:0; }
  .toast-close { background:transparent; border:none; color:#9ca3af; cursor:pointer; padding:2px; font-size:14px; line-height:1; }
  .toast-close:hover { color:#374151; }
  @keyframes toastIn { from{opacity:0;transform:translateY(-10px) scale(.98);}to{opacity:1;transform:none;} }
  @keyframes toastOut { to{opacity:0;transform:translateY(-8px) scale(.98);} }

  /* Responsive */
  @media(max-width:768px) {
    .login-wrap { grid-template-columns:1fr; }
    .login-left { display:none; }
    .login-right { padding:30px 20px; min-height:100vh; align-items:flex-start; padding-top:60px; }
  }
  @media(max-width:480px) { .role-cards { grid-template-columns:repeat(2,1fr); } }
`;

const ROLES: { value: CanonicalRole; icon: string; title: string }[] = [
  { value: 'Owner',   icon: 'fa-user',        title: 'User' },
  { value: 'Agent',   icon: 'fa-handshake',   title: 'Agent' },
  { value: 'Builder', icon: 'fa-hard-hat',    title: 'Builder' },
];

export default function LoginPage({ initialTab = 'signin', onNavigate, onLoginSuccess }: LoginPageProps) {
  const { login, register, bootstrapAdmin } = useAuth();
  const [tab, setTab] = useState<'signin' | 'register' | 'forgot' | 'setup'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  // Site stats (dynamic)
  const [siteStats, setSiteStats] = useState<Partial<ListingStatsResponse>>({
    active_listings: undefined,
    cities_covered: undefined,
    featured_listings: undefined,
    registered_users: undefined,
  });

  useEffect(() => {
    api.get<ListingStatsResponse>('/api/v1/listings/stats')
      .then(r => setSiteStats(r.data))
      .catch(() => {/* numbers stay as a dash */});
  }, []);

  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass]   = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  // Show/hide toggles for the other password fields
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const togglePw = (key: string): void => setShowPw(prev => ({ ...prev, [key]: !prev[key] }));
  const eyeBtn = (key: string) => (
    <button type="button" className="toggle-eye" onClick={() => togglePw(key)}
      aria-label={showPw[key] ? 'Hide password' : 'Show password'}>
      <i className={`fas ${showPw[key] ? 'fa-eye-slash' : 'fa-eye'}`} />
    </button>
  );
  const [remember, setRemember] = useState(false);

  // Register state
  const [regRole, setRegRole]   = useState<CanonicalRole>('Owner');
  const [regName, setRegName]   = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regOtp,   setRegOtp]   = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const regCooldown = useResendCooldown();
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // Forgot state
  const [fgEmail, setFgEmail]   = useState('');
  const [fgOtp,   setFgOtp]     = useState('');
  const [fgPass,  setFgPass]    = useState('');
  const [fgStep,  setFgStep]    = useState<1 | 2>(1);  // 1 = enter email, 2 = otp+new pass
  const fgCooldown = useResendCooldown();

  const [toasts, setToasts] = useState<Array<{ id: number; type: 'error' | 'success' | 'info'; title: string; msg: string }>>([]);

  const showToast = (msg: string, type: 'error' | 'success' | 'info' = 'info', title?: string) => {
    const id = Date.now();
    const defaultTitle = type === 'error' ? 'OTP failed' : type === 'success' ? 'Success' : 'Notice';
    const newToast = { id, type, title: title || defaultTitle, msg };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === 'error' ? 5000 : 3500);
  };

  const showError   = (msg: string): void => { setError(msg); setSuccess(''); };
  const showSuccess = (msg: string): void => { setSuccess(msg); setError(''); };
  const switchTab   = (t: 'signin' | 'register' | 'forgot' | 'setup'): void => { setTab(t); setError(''); setSuccess(''); };

  const [needsAdmin, setNeedsAdmin] = useState(false);
  const [admName, setAdmName] = useState('');
  const [admPhone, setAdmPhone] = useState('');
  const [admEmail, setAdmEmail] = useState('');
  const [admPass, setAdmPass] = useState('');
  const [admConfirm, setAdmConfirm] = useState('');

  useEffect(() => {
    api.get<{ needs_admin?: boolean }>('/api/v1/auth/admin-setup')
      .then((res) => setNeedsAdmin(Boolean(res.data?.needs_admin)))
      .catch(() => setNeedsAdmin(false));
  }, []);

  // ── Sign In ──
  const handleSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!siEmail || !siPass) {
      showToast('Enter email and password.', 'error', 'Missing details');
      return showError('Enter email and password.');
    }
    setLoading(true); setError('');
    try {
      const session = await login(siEmail, siPass, remember);
      showToast('Login successful', 'success', 'Welcome');
      if (session.user?.role?.toLowerCase() === 'admin') {
        onNavigate?.('admin');
        return;
      }
      onLoginSuccess?.();
      onNavigate?.('home');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Sign-in failed. Check your credentials.');
      showToast(msg, 'error', 'Login failed');
      showError(msg);
    } finally { setLoading(false); }
  };

  // ── Send OTP (register) ──
  const handleSendRegOtp = async (): Promise<void> => {
    if (!regName) {
      showToast('Enter client name', 'error', 'Missing details');
      return showError('Enter your full name.');
    }
    if (!regPhone) {
      showToast('Enter mobile number', 'error', 'Missing details');
      return showError('Enter your mobile number.');
    }
    if (!regEmail) {
      showToast('Enter email ID', 'error', 'Missing details');
      return showError('Enter your email.');
    }
    setLoading(true); setError('');
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/send-otp', { email: regEmail, action: 'register', name: regName, phone: regPhone });
      setOtpSent(true);
      setOtpVerified(false);
      setRegOtp('');
      regCooldown.start();
      showToast(res.data.message || 'OTP sent to your email. Valid for 10 minutes.', 'success', 'OTP sent');
      showSuccess(res.data.message || 'OTP sent to your email.');
    } catch (err: unknown) {
      // An OTP already went to this email in the last minute: it is still valid, so let them enter it.
      const wait = retryAfterSeconds(err);
      const msg = getApiErrorMessage(err, 'Failed to send OTP.');
      if (wait) {
        regCooldown.start(wait);
        setOtpSent(true);
        showToast(msg, 'info', 'OTP already sent');
        return showSuccess(msg);
      }
      showToast(msg, 'error', 'OTP failed');
      showError(msg);
    } finally { setLoading(false); }
  };

  // ── Verify OTP (register) — the account can only be created after this succeeds ──
  const handleVerifyRegOtp = async (): Promise<void> => {
    if (!/^\d{6}$/.test(regOtp.trim())) {
      showToast('Enter the 6-digit OTP sent to your email', 'error', 'OTP required');
      return showError('Enter the 6-digit OTP sent to your email.');
    }
    setLoading(true); setError('');
    try {
      await api.post<MessageResponse>('/api/v1/auth/verify-otp', { email: regEmail, otp: regOtp.trim() });
      setOtpVerified(true);
      showToast('Email verified. You can now create your account.', 'success', 'Verified');
      showSuccess('Email verified. You can now create your account.');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Invalid or expired OTP.');
      showToast(msg, 'error', 'OTP failed');
      showError(msg);
    } finally { setLoading(false); }
  };

  // ── Register ──
  const handleRegister = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!regName) return showError('Enter your full name.');
    if (!regPhone) return showError('Enter your mobile number.');
    if (!regEmail) return showError('Enter your email.');
    if (!otpSent) {
      showToast('Send an OTP to your email and enter it to continue', 'error', 'Verify email');
      return showError('Please verify your email. Click "Send OTP" and enter the code you receive.');
    }
    if (!otpVerified) {
      showToast('Verify the OTP sent to your email first', 'error', 'Verify email');
      return showError('Enter the OTP from your email and click "Verify" before creating your account.');
    }
    if (regPass.length < 6) {
      showToast('Password must be at least 6 characters', 'error', 'Weak password');
      return showError('Password must be at least 6 characters.');
    }
    if (regPass !== regConfirm) {
      showToast('Passwords do not match', 'error', 'Password mismatch');
      return showError('Passwords do not match.');
    }
    if (!agreePrivacy) {
      showToast('Please agree to Terms of Use and Privacy Policy', 'error', 'Notice');
      return showError('Please agree to the Terms of Use and Privacy Policy.');
    }
    setLoading(true); setError('');
    try {
      await register({ name: regName, phone: regPhone, email: regEmail, password: regPass, role: regRole, otp: regOtp.trim(), business_name: regBusiness.trim() || undefined });
      showToast('Account created successfully!', 'success', 'Welcome');
      onLoginSuccess?.();
      onNavigate?.('home');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Registration failed.');
      showToast(msg, 'error', 'Registration failed');
      showError(msg);
    } finally { setLoading(false); }
  };

  // ── Forgot: Send OTP ──
  const handleFgSendOtp = async (): Promise<void> => {
    if (!fgEmail) return showError('Enter your email address.');
    setLoading(true); setError('');
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/send-otp', { email: fgEmail, action: 'forgot' });
      setFgStep(2);
      fgCooldown.start();
      showSuccess(res.data.message || 'Reset OTP sent to your email.');
    } catch (err: unknown) {
      const wait = retryAfterSeconds(err);
      if (wait) { fgCooldown.start(wait); setFgStep(2); }
      showError(getApiErrorMessage(err, 'Failed to send OTP.'));
    } finally { setLoading(false); }
  };

  // ── Forgot: Reset ──
  const handleFgReset = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!fgOtp)  return showError('Enter the OTP.');
    if (!fgPass) return showError('Enter your new password.');
    setLoading(true); setError('');
    try {
      const res = await api.post<MessageResponse>('/api/v1/auth/reset-password', { email: fgEmail, otp: fgOtp, new_password: fgPass });
      showSuccess(res.data.message || 'Password reset! Please sign in.');
      setTimeout(() => switchTab('signin'), 1500);
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Reset failed.'));
    } finally { setLoading(false); }
  };

  const handleBootstrapAdmin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!admName || !admPhone || !admEmail || !admPass) {
      return showError('Fill in name, mobile, email, and password.');
    }
    if (admPass.length < 8) {
      return showError('Admin password must be at least 8 characters.');
    }
    if (admPass !== admConfirm) {
      return showError('Passwords do not match.');
    }
    setLoading(true);
    setError('');
    try {
      await bootstrapAdmin({
        name: admName,
        phone: admPhone,
        email: admEmail,
        password: admPass,
        confirm_password: admConfirm,
        role: 'Admin'
      });
      setNeedsAdmin(false);
      showToast('Admin account created', 'success', 'Welcome');
      onNavigate?.('admin');
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Could not create the admin account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-login-root">
      <style>{CSS}</style>

      <div className="login-wrap">
        {/* ── LEFT PANEL ── */}
        <div className="login-left">
          {/* Logo — exact same structure as tradecall.in */}
          <div className="ll-logo" onClick={() => onNavigate?.('home')} style={{ cursor: 'pointer' }} title="Go to TradeCall India Home">
            <div className="logo-bars">
              <span className="logo-bar" />
              <span className="logo-bar" />
              <span className="logo-bar" />
            </div>
            <div className="logo-arrow-sm" />
            <span>TradeCall<em>India</em></span>
          </div>

          <h2 className="ll-heading">Haryana's Fastest Growing Property Portal</h2>
          <p className="ll-sub">
            Find properties, list your assets, and grow your business across Palwal, Faridabad, Gurugram, and 11 more cities in the NCR corridor.
          </p>
          <div className="ll-features">
            {[
              'Post property & business listings for free',
              'Get enquiries directly on your number',
              'Promote with Featured or Banner packages',
              'Manage all your listings in one dashboard',
            ].map(f => (
              <div key={f} className="ll-feat">
                <i className="fas fa-check-circle" />
                {f}
              </div>
            ))}
          </div>
          <div className="ll-stats">
            {([
              { key: 'active_listings',   lbl: 'Active Listings' },
              { key: 'cities_covered',    lbl: 'Cities Covered' },
              { key: 'featured_listings', lbl: 'Featured Listings' },
              { key: 'registered_users',  lbl: 'Registered Users' },
            ] as const satisfies Array<{ key: keyof ListingStatsResponse; lbl: string }>).map(s => (
              <div key={s.lbl} className="ll-stat">
                <div className="num">
                  {siteStats[s.key] ?? '–'}
                </div>
                <div className="lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          <div className="ll-footer-txt">
            Based in Palwal, Haryana © 2026 TradeCall India &nbsp;·&nbsp;
            <a onClick={() => onNavigate?.('terms')}>Privacy Policy</a> &nbsp;·&nbsp;
            <a onClick={() => onNavigate?.('terms')}>Terms of Use</a>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-right">
          <div className="login-form-box">

            {/* Tabs (hidden on forgot) */}
            {tab !== 'forgot' && tab !== 'setup' && (
              <div className="auth-tabs" id="authTabs">
                <button className={`auth-tab${tab === 'signin' ? ' active' : ''}`} onClick={() => switchTab('signin')}>Sign In</button>
                <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>Create Account</button>
              </div>
            )}

            {/* Alerts */}
            {error   && <div className="tc-alert error"><i className="fas fa-exclamation-circle" /> {error}</div>}
            {success && <div className="tc-alert success"><i className="fas fa-check-circle" /> {success}</div>}

            {/* ── SIGN IN ── */}
            {tab === 'signin' && (
              <div id="signinPanel">
                <div className="lf-heading">Sign in to your account</div>
                <div className="lf-sub">Sign in to manage your listings and enquiries</div>
                <form onSubmit={handleSignIn}>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" id="emailInput" placeholder="yourname@gmail.com" required
                      value={siEmail} onChange={e => setSiEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-wrap">
                      <input type={siShowPw ? 'text' : 'password'} id="passInput" placeholder="Enter your password" required
                        value={siPass} onChange={e => setSiPass(e.target.value)} />
                      <button type="button" className="toggle-eye" onClick={() => setSiShowPw(v => !v)}>
                        <i className={`fas ${siShowPw ? 'fa-eye-slash' : 'fa-eye'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="forgot-row">
                    <label>
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                      Remember me for 30 days
                    </label>
                    <button type="button" className="forgot-link" onClick={() => switchTab('forgot')}>Forgot password?</button>
                  </div>
                  <button type="submit" className="btn-signin" id="btnSignIn" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
                <div className="create-acc">
                  Don't have an account? <button onClick={() => switchTab('register')}>Create one free</button>
                </div>
                <SignupGuide />
                {needsAdmin && (
                  <div className="create-acc">
                    Need the admin panel? <button type="button" onClick={() => switchTab('setup')}>Create the first admin</button>
                  </div>
                )}
              </div>
            )}

            {tab === 'setup' && (
              <div id="adminSetupPanel">
                <div className="lf-heading">Create the first admin</div>
                <div className="lf-sub">This form closes once an admin account exists. Later admins are added from User Management.</div>
                <form onSubmit={(e) => void handleBootstrapAdmin(e)}>
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" placeholder="Enter your full name" required
                      value={admName} onChange={(e) => setAdmName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Mobile No</label>
                    <input
                      type="tel"
                      placeholder="10 digit mobile number"
                      required
                      maxLength={10}
                      value={admPhone}
                      onChange={(e) => setAdmPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="admin@tradecall.in" required
                      value={admEmail} onChange={(e) => setAdmEmail(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-wrap">
                      <input type={showPw.admPass ? 'text' : 'password'} placeholder="At least 8 characters" required minLength={8}
                        value={admPass} onChange={(e) => setAdmPass(e.target.value)} />
                      {eyeBtn('admPass')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="password-wrap">
                      <input type={showPw.admConfirm ? 'text' : 'password'} placeholder="Re-enter password" required
                        value={admConfirm} onChange={(e) => setAdmConfirm(e.target.value)} />
                      {eyeBtn('admConfirm')}
                    </div>
                  </div>
                  <button type="submit" className="btn-signin" disabled={loading}>
                    {loading ? 'Creating admin…' : 'Create admin and sign in'}
                  </button>
                </form>
                <div className="create-acc">
                  <button type="button" onClick={() => switchTab('signin')}>Back to Sign In</button>
                </div>
              </div>
            )}

            {/* ── REGISTER ── */}
            {tab === 'register' && (
              <div id="registerPanel">
                <div className="lf-heading">Create your account</div>
                <div className="lf-sub">Start posting and managing listings today</div>
                <form onSubmit={handleRegister}>
                  {/* Role cards */}
                  <div className="role-selection">
                    <span className="role-selection-label">I am a…</span>
                    <div className="role-cards">
                      {ROLES.map(r => (
                        <div key={r.value} className={`role-card${regRole === r.value ? ' active' : ''}`}
                          onClick={() => setRegRole(r.value)}>
                          <i className={`fas ${r.icon}`} />
                          <div className="rc-title">{r.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Client Name</label>
                    <input type="text" placeholder="Enter your full name" required
                      value={regName} onChange={e => setRegName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Business Name <span style={{ color: '#9ca3af', fontWeight: 500 }}>(optional)</span></label>
                    <input type="text" placeholder="e.g. Sharma Properties" maxLength={150}
                      value={regBusiness} onChange={e => setRegBusiness(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Mobile No</label>
                    <input
                      type="tel"
                      placeholder="10 digit mobile number"
                      required
                      maxLength={10}
                      value={regPhone}
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        const target = e.currentTarget;
                        target.value = target.value.replace(/\D/g, '').slice(0, 10);
                      }}
                      onChange={e => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email ID</label>
                    <div className="send-otp-row">
                      <input type="email" placeholder="yourname@gmail.com" required
                        value={regEmail} onChange={e => { setRegEmail(e.target.value); setOtpSent(false); setOtpVerified(false); setRegOtp(''); regCooldown.reset(); }} />
                      <button type="button" className="btn-send-otp" id="btnSendRegOtp"
                        onClick={() => void handleSendRegOtp()} disabled={loading || regCooldown.secondsLeft > 0}>
                        {regCooldown.secondsLeft > 0 ? `Resend in ${regCooldown.secondsLeft}s` : otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                  {otpSent && (
                    <div className="form-group">
                      <label>Enter OTP</label>
                      <div className="send-otp-row">
                        <input className="otp-input" type="text" inputMode="numeric" maxLength={6} placeholder="123456" required
                          value={regOtp} readOnly={otpVerified}
                          onChange={e => { setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpVerified(false); }} />
                        <button type="button" className="btn-send-otp" onClick={() => void handleVerifyRegOtp()}
                          disabled={loading || otpVerified || regOtp.length !== 6}>
                          {otpVerified ? <><i className="fas fa-check" /> Verified</> : 'Verify'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-wrap">
                      <input type={showPw.regPass ? 'text' : 'password'} placeholder="Create password" required minLength={6}
                        value={regPass} onChange={e => setRegPass(e.target.value)} />
                      {eyeBtn('regPass')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="password-wrap">
                      <input type={showPw.regConfirm ? 'text' : 'password'} placeholder="Re-enter password" required
                        value={regConfirm} onChange={e => setRegConfirm(e.target.value)} />
                      {eyeBtn('regConfirm')}
                    </div>
                  </div>

                  {/* Privacy Policy agree — industry standard */}
                  <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer',marginBottom:'16px',fontSize:'13px',color:'#374151',lineHeight:'1.5'}}>
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={e => setAgreePrivacy(e.target.checked)}
                      style={{marginTop:'2px',accentColor:'#0c6253',flexShrink:0,width:'15px',height:'15px',cursor:'pointer'}}
                    />
                    <span>
                      I agree to the{' '}
                      <button type="button" onClick={() => onNavigate?.('terms')}
                        style={{color:'#0c6253',fontWeight:700,background:'none',border:'none',padding:0,cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>
                        Terms of Use
                      </button>
                      {' '}and{' '}
                      <button type="button" onClick={() => onNavigate?.('privacy')}
                        style={{color:'#0c6253',fontWeight:700,background:'none',border:'none',padding:0,cursor:'pointer',fontSize:'13px',fontFamily:'inherit'}}>
                        Privacy Policy
                      </button>
                    </span>
                  </label>

                  <button type="submit" className="btn-signin" disabled={loading || !agreePrivacy || !otpVerified}
                    title={!otpVerified ? 'Verify your email with the OTP first' : undefined}
                    style={!agreePrivacy || !otpVerified ? {opacity:0.6,cursor:'not-allowed'} : {}}>
                    {loading ? 'Creating Account…' : 'Create Account'}
                  </button>
                </form>
                <div className="create-acc">
                  Already have an account? <button onClick={() => switchTab('signin')}>Sign In</button>
                </div>
                <SignupGuide />
              </div>
            )}

            {/* ── FORGOT PASSWORD ── */}
            {tab === 'forgot' && (
              <div id="forgotPanel">
                <div className="lf-heading">Reset Password</div>
                <div className="lf-sub">Enter your registered email to receive an OTP</div>
                {fgStep === 1 ? (
                  <div id="forgotStep1">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input type="email" placeholder="yourname@gmail.com"
                        value={fgEmail} onChange={e => { setFgEmail(e.target.value); fgCooldown.reset(); }} />
                    </div>
                    <button className="btn-signin" disabled={loading} onClick={() => void handleFgSendOtp()}>
                      {loading ? 'Sending…' : 'Send Reset OTP'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFgReset} id="forgotStep2">
                    <div className="form-group">
                      <label>Enter OTP</label>
                      <input className="otp-input" type="text" maxLength={6} placeholder="123456" required
                        value={fgOtp} onChange={e => setFgOtp(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <div className="password-wrap">
                        <input type={showPw.fgPass ? 'text' : 'password'} placeholder="Enter new password" required minLength={6}
                          value={fgPass} onChange={e => setFgPass(e.target.value)} />
                        {eyeBtn('fgPass')}
                      </div>
                    </div>
                    <button type="submit" className="btn-signin" disabled={loading}>
                      {loading ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </form>
                )}
                <div className="create-acc" style={{marginTop:'16px'}}>
                  <button onClick={() => switchTab('signin')}>
                    <i className="fas fa-arrow-left" /> Back to Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification Stack (matching original tradecall.in) */}
      <div className="toast-stack" id="toastStack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-icon">
              <i className={`fas ${t.type === 'success' ? 'fa-check' : t.type === 'error' ? 'fa-exclamation' : 'fa-info'}`} />
            </div>
            <div className="toast-body">
              <p className="toast-title">{t.title}</p>
              <p className="toast-msg">{t.msg}</p>
            </div>
            <button
              type="button"
              className="toast-close"
              aria-label="Close"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        ))}
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/919992292828?text=Hello%20TradeCall%20India,%20I%20have%20an%20enquiry"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-btn"
        title="Chat on WhatsApp"
        aria-label="Chat on WhatsApp"
      >
        <i className="fab fa-whatsapp"></i>
      </a>
    </div>
  );
}
