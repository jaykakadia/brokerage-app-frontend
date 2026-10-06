import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/api';
import type { NavigateFunction } from '../types';

export interface AdminLoginPageProps {
  onNavigate: NavigateFunction;
}

export default function AdminLoginPage({ onNavigate }: AdminLoginPageProps) {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role?.toLowerCase() === 'admin') {
      onNavigate('admin');
    }
  }, [authLoading, user, onNavigate]);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const typed = username.trim();
    if (!typed || !password) {
      setError('Enter the admin username and password.');
      return;
    }
    const email = typed.toLowerCase() === 'adminpanel' ? 'admin@tradecall.in' : typed;

    setSubmitting(true);
    setError('');
    try {
      const session = await login(email, password);
      if (session.user?.role?.toLowerCase() !== 'admin') {
        await logout();
        setError('This account is not an administrator.');
        return;
      }
      onNavigate('admin');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Sign-in failed. Check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-root">
      <style>{`
        .admin-login-root {
          min-height: 100vh;
          margin: 0;
          background: #f4f6f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          padding: 24px;
        }
        .admin-login-card {
          background: #fff;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        .admin-login-logo { margin-bottom: 24px; display: inline-flex; flex-direction: column; align-items: center; }
        .admin-login-logo i { font-size: 40px; color: #0c6253; }
        .admin-login-word { font-size: 24px; font-weight: 800; margin-top: 10px; }
        .admin-login-word .tc { color: #0c6253; }
        .admin-login-word .ad { color: #f97316; }
        .admin-login-card h2 { font-size: 18px; color: #111827; margin: 0 0 24px; font-weight: 700; }
        .admin-login-card .form-group { margin-bottom: 20px; text-align: left; position: relative; }
        .admin-login-card label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
        .admin-login-card input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }
        .admin-login-card input:focus { outline: none; border-color: #0c6253; box-shadow: 0 0 0 3px rgba(12, 98, 83, 0.1); }
        .admin-login-password { position: relative; }
        .admin-login-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          line-height: 1;
          cursor: pointer;
          color: #6b7280;
          background: none;
          border: none;
          padding: 0;
        }
        .admin-login-eye i { font-size: 14px; line-height: 1; }
        .admin-login-submit {
          width: 100%;
          background: #0c6253;
          color: #fff;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .admin-login-submit:hover { background: #08493d; }
        .admin-login-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .admin-login-error {
          color: #dc2626;
          background: #fee2e2;
          padding: 10px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .admin-login-back {
          display: inline-block;
          margin-top: 20px;
          color: #6b7280;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .admin-login-back:hover { color: #0c6253; }
      `}</style>

      <div className="admin-login-card">
        <div className="admin-login-logo">
          <i className="fas fa-shield-alt"></i>
          <div className="admin-login-word"><span className="tc">TradeCall</span><span className="ad">Admin</span></div>
        </div>
        <h2>Sign in to Master Panel</h2>
        {error && <div className="admin-login-error">{error}</div>}
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="admin-login-password">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              className="admin-login-eye"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
            </div>
          </div>
          <button type="submit" className="admin-login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Secure Login'}
          </button>
        </form>
        <button type="button" className="admin-login-back" onClick={() => onNavigate('home')}>
          <i className="fas fa-arrow-left"></i> Back to Website
        </button>
      </div>

      <a
        href="https://wa.me/919992292828"
        className="floating-whatsapp"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with us on WhatsApp"
      >
        <i className="fab fa-whatsapp"></i>
      </a>
    </div>
  );
}
