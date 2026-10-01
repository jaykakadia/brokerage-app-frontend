import { useState } from 'react';
import api, { getApiErrorMessage } from '../services/api';
import { normalizeExternalUrl } from '../utils/url';
import type { MessageResponse, User } from '../types';

type LinkKey = 'facebook_url' | 'website_url' | 'x_url';

const PLATFORMS: Array<{ key: LinkKey; label: string; icon: string; color: string; placeholder: string }> = [
  { key: 'facebook_url', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2', placeholder: 'facebook.com/yourpage' },
  { key: 'website_url', label: 'Website', icon: 'fas fa-globe', color: '#0c6253', placeholder: 'yourwebsite.com' },
  { key: 'x_url', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#111827', placeholder: 'x.com/yourhandle' }
];

const displayUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

export interface SocialLinksPanelProps {
  user: User;
  onSaved: () => Promise<void>;
}

export default function SocialLinksPanel({ user, onSaved }: SocialLinksPanelProps) {
  const [editing, setEditing] = useState<LinkKey | null>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (key: LinkKey): void => {
    setEditing(key);
    setDraft(user[key] || '');
    setMessage(null);
  };

  const saveLink = async (key: LinkKey, label: string, raw: string): Promise<void> => {
    const url = normalizeExternalUrl(raw);
    if (url === null) {
      setMessage({ type: 'error', text: `Enter a valid ${label} link.` });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.put<MessageResponse>('/api/v1/users/profile', { [key]: url });
      await onSaved();
      setEditing(null);
      setMessage({ type: 'success', text: url ? `${label} link saved.` : `${label} link removed.` });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to save link.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="social-panel">
      <div className="social-panel-head">
        <h2>Social Links</h2>
        <p>Add your pages so buyers can learn more about you.</p>
      </div>

      {message && (
        <div className={`social-msg ${message.type === 'error' ? 'is-error' : ''}`}>{message.text}</div>
      )}

      {PLATFORMS.map(({ key, label, icon, color, placeholder }) => {
        const saved = user[key] || '';
        const isEditing = editing === key;
        return (
          <div className="social-row" key={key}>
            <div className="social-icon" style={{ color, background: `${color}14` }}>
              <i className={icon}></i>
            </div>
            <div className="social-label">{label}</div>

            {isEditing ? (
              <form
                className="social-edit"
                onSubmit={(e) => { e.preventDefault(); void saveLink(key, label, draft); }}
              >
                <input
                  type="text"
                  inputMode="url"
                  placeholder={placeholder}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn-outline" disabled={saving} onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            ) : saved ? (
              <div className="social-saved">
                <a href={saved} target="_blank" rel="noopener noreferrer">
                  {displayUrl(saved)} <i className="fas fa-external-link-alt"></i>
                </a>
                <button type="button" className="social-icon-btn" title={`Edit ${label}`} onClick={() => startEdit(key)}>
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  type="button"
                  className="social-icon-btn is-danger"
                  title={`Remove ${label}`}
                  disabled={saving}
                  onClick={() => void saveLink(key, label, '')}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ) : (
              <button type="button" className="account-add-link" onClick={() => startEdit(key)}>
                <i className="fas fa-plus"></i> Add {label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
