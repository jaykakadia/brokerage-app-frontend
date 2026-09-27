import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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
  .role-card .rc-title { font-size:12px; font-weight:700; color:#111827; margin-bottom:4px; }
  .role-card.active .rc-title { color:#0c6253; }
  .role-card .rc-sub { font-size:10px; color:#6b7280; line-height:1.3; }

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

const ROLES = [
  { value: 'Owner',   icon: 'fa-user',        title: 'Owner',   sub: 'I own the property' },
  { value: 'Agent',   icon: 'fa-handshake',   title: 'Agent',   sub: 'I represent clients' },
  { value: 'Builder', icon: 'fa-hard-hat',    title: 'Builder', sub: 'I develop properties' },
];

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('signin');   // signin | register | forgot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  // Site stats (dynamic)
  const [siteStats, setSiteStats] = useState({
    active_listings: null,
    cities_covered: null,
    featured_listings: null,
    registered_users: null,
  });

  useEffect(() => {
    api.get('/api/v1/listings/stats')
      .then(r => setSiteStats(r.data))
      .catch(() => {/* keep static fallback */});
  }, []);

  const fmt = (val, fallback) => val !== null ? val : fallback;

  const [siEmail, setSiEmail] = useState('');
  const [siPass, setSiPass]   = useState('');
  const [siShowPw, setSiShowPw] = useState(false);
  const [remember, setRemember] = useState(false);

  // Register state
  const [regRole, setRegRole]   = useState('Owner');
  const [regName, setRegName]   = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass,  setRegPass]  = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regOtp,   setRegOtp]   = useState('');
  const [otpSent,  setOtpSent]  = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // Forgot state
  const [fgEmail, setFgEmail]   = useState('');
  const [fgOtp,   setFgOtp]     = useState('');
  const [fgPass,  setFgPass]    = useState('');
  const [fgStep,  setFgStep]    = useState(1);  // 1 = enter email, 2 = otp+new pass

  const showError   = (msg) => { setError(msg); setSuccess(''); };
  const showSuccess = (msg) => { setSuccess(msg); setError(''); };
  const switchTab   = (t)   => { setTab(t); setError(''); setSuccess(''); };

  // ── Sign In ──
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!siEmail || !siPass) return showError('Enter email and password.');
    setLoading(true); setError('');
    try {
      await login(siEmail, siPass, remember);
      onLoginSuccess?.();
      onNavigate?.('home');
    } catch (err) {
      showError(err.response?.data?.detail || 'Sign-in failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  // ── Send OTP (register) ──
  const handleSendRegOtp = async () => {
    if (!regName)  return showError('Enter your full name.');
    if (!regPhone) return showError('Enter your mobile number.');
    if (!regEmail) return showError('Enter your email.');
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/v1/auth/send-otp', { email: regEmail, action: 'register', name: regName, phone: regPhone });
      setOtpSent(true);
      showSuccess(res.data.message || 'OTP sent to your email.');
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName)  return showError('Enter your full name.');
    if (!regPhone) return showError('Enter your mobile number.');
    if (!regEmail) return showError('Enter your email.');
    if (regPass.length < 6) return showError('Password must be at least 6 characters.');
    if (regPass !== regConfirm) return showError('Passwords do not match.');
    if (!agreePrivacy) return showError('Please agree to the Terms of Use and Privacy Policy.');
    setLoading(true); setError('');
    try {
      await register({ name: regName, phone: regPhone, email: regEmail, password: regPass, role: regRole, otp: regOtp || undefined });
      onLoginSuccess?.();
      onNavigate?.('home');
    } catch (err) {
      showError(err.response?.data?.detail || 'Registration failed.');
    } finally { setLoading(false); }
  };

  // ── Forgot: Send OTP ──
  const handleFgSendOtp = async () => {
    if (!fgEmail) return showError('Enter your email address.');
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/v1/auth/send-otp', { email: fgEmail, action: 'forgot' });
      setFgStep(2);
      showSuccess(res.data.message || 'Reset OTP sent to your email.');
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  // ── Forgot: Reset ──
  const handleFgReset = async (e) => {
    e.preventDefault();
    if (!fgOtp)  return showError('Enter the OTP.');
    if (!fgPass) return showError('Enter your new password.');
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/v1/auth/reset-password', { email: fgEmail, otp: fgOtp, new_password: fgPass });
      showSuccess(res.data.message || 'Password reset! Please sign in.');
      setTimeout(() => switchTab('signin'), 1500);
    } catch (err) {
      showError(err.response?.data?.detail || 'Reset failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="tc-login-root">
      <style>{CSS}</style>

      <div className="login-wrap">
        {/* ── LEFT PANEL ── */}
        <div className="login-left">
          {/* Logo — exact same structure as tradecall.in */}
          <div className="ll-logo">
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
            {[
              { key: 'active_listings',   fallback: 61,  suffix: '+', lbl: 'Active Listings' },
              { key: 'cities_covered',    fallback: 16,  suffix: '',  lbl: 'Cities Covered' },
              { key: 'featured_listings', fallback: 8,   suffix: '',  lbl: 'Featured Listings' },
              { key: 'registered_users',  fallback: 12,  suffix: '+', lbl: 'Registered Users' },
            ].map(s => (
              <div key={s.lbl} className="ll-stat">
                <div className="num">
                  {fmt(siteStats[s.key], s.fallback)}{s.suffix}
                </div>
                <div className="lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          <div className="ll-footer-txt">
            Based in Palwal, Haryana © 2026 TradeCall India &nbsp;·&nbsp;
            <a onClick={() => onNavigate?.('privacy')}>Privacy Policy</a> &nbsp;·&nbsp;
            <a onClick={() => onNavigate?.('terms')}>Terms of Use</a>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="login-right">
          <div className="login-form-box">

            {/* Tabs (hidden on forgot) */}
            {tab !== 'forgot' && (
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
                          <div className="rc-sub">{r.sub}</div>
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
                    <label>Mobile No</label>
                    <input
                      type="tel"
                      placeholder="10 digit mobile number"
                      required
                      maxLength={10}
                      value={regPhone}
                      onInput={e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }}
                      onChange={e => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email ID</label>
                    <div className="send-otp-row">
                      <input type="email" placeholder="yourname@gmail.com" required
                        value={regEmail} onChange={e => setRegEmail(e.target.value)} />
                      <button type="button" className="btn-send-otp" id="btnSendRegOtp"
                        onClick={handleSendRegOtp} disabled={loading}>
                        {otpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    </div>
                  </div>
                  {otpSent && (
                    <div className="form-group">
                      <label>Enter OTP</label>
                      <input className="otp-input" type="text" maxLength={6} placeholder="123456"
                        value={regOtp} onChange={e => setRegOtp(e.target.value)} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="Create password" required minLength={6}
                      value={regPass} onChange={e => setRegPass(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="Re-enter password" required
                      value={regConfirm} onChange={e => setRegConfirm(e.target.value)} />
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

                  <button type="submit" className="btn-signin" disabled={loading || !agreePrivacy}
                    style={!agreePrivacy ? {opacity:0.6,cursor:'not-allowed'} : {}}>
                    {loading ? 'Creating Account…' : 'Create Account'}
                  </button>
                </form>
                <div className="create-acc">
                  Already have an account? <button onClick={() => switchTab('signin')}>Sign In</button>
                </div>
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
                        value={fgEmail} onChange={e => setFgEmail(e.target.value)} />
                    </div>
                    <button className="btn-signin" disabled={loading} onClick={handleFgSendOtp}>
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
                        <input type="password" placeholder="Enter new password" required minLength={6}
                          value={fgPass} onChange={e => setFgPass(e.target.value)} />
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
    </div>
  );
}
