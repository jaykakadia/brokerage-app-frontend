import { useCallback, useEffect, useState } from 'react';
import { deleteEnquiry, getAdminEnquiries, getApiErrorMessage, getEnquiryCounts, updateEnquiry } from '../services/api';
import type { Enquiry, EnquiryCounts, EnquiryStatus } from '../types';

const STATUS_TABS: Array<{ key: EnquiryStatus | 'all'; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'all', label: 'All' }
];

const STATUS_LABEL: Record<EnquiryStatus, string> = { new: 'New', in_progress: 'In Progress', resolved: 'Resolved' };

const EMPTY_COUNTS: EnquiryCounts = { new: 0, in_progress: 0, resolved: 0, all: 0 };

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export interface AdminEnquiriesProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  /** Lets the dashboard keep its "new enquiries" badge in sync */
  onCountsChange?: (counts: EnquiryCounts) => void;
}

export default function AdminEnquiries({ showToast, onCountsChange }: AdminEnquiriesProps) {
  const [tab, setTab] = useState<EnquiryStatus | 'all'>('new');
  const [search, setSearch] = useState('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<EnquiryCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const refreshCounts = useCallback(async () => {
    try {
      const res = await getEnquiryCounts();
      if (res.data?.data) {
        setCounts(res.data.data);
        onCountsChange?.(res.data.data);
      }
    } catch {/* counts are a convenience; the list shows errors */}
  }, [onCountsChange]);

  const load = useCallback(async (status: EnquiryStatus | 'all', query: string) => {
    setLoading(true);
    try {
      const res = await getAdminEnquiries({ status, search: query.trim() || undefined });
      setEnquiries(res.data?.data || []);
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to load enquiries'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load(tab, search);
    void refreshCounts();
    // search runs on submit, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const changeStatus = async (enquiry: Enquiry, status: EnquiryStatus): Promise<void> => {
    setBusyId(enquiry.id);
    try {
      await updateEnquiry(enquiry.id, { status });
      showToast(`Enquiry from ${enquiry.name} marked ${STATUS_LABEL[status]}`);
      await Promise.all([load(tab, search), refreshCounts()]);
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to update enquiry'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const saveNote = async (enquiry: Enquiry): Promise<void> => {
    setBusyId(enquiry.id);
    try {
      const res = await updateEnquiry(enquiry.id, { admin_note: notes[enquiry.id] ?? '' });
      const saved = res.data?.data;
      if (saved) setEnquiries((list) => list.map((e) => (e.id === saved.id ? saved : e)));
      showToast('Note saved');
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to save note'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (enquiry: Enquiry): Promise<void> => {
    if (!window.confirm(`Delete the enquiry from ${enquiry.name}? This cannot be undone.`)) return;
    setBusyId(enquiry.id);
    try {
      await deleteEnquiry(enquiry.id);
      showToast('Enquiry deleted');
      await Promise.all([load(tab, search), refreshCounts()]);
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to delete enquiry'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="enq-panel">
      <div className="enq-head">
        <div>
          <h2>Enquiry Management</h2>
          <p>Messages sent from the Contact Us form.</p>
        </div>
        <form
          className="enq-search"
          onSubmit={(e) => { e.preventDefault(); void load(tab, search); }}
        >
          <input
            type="text"
            placeholder="Search name, email, phone, message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary" aria-label="Search"><i className="fas fa-search"></i></button>
        </form>
      </div>

      <div className="enq-tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`enq-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} <span>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="enq-empty"><i className="fas fa-spinner fa-spin"></i> Loading enquiries...</div>
      ) : enquiries.length === 0 ? (
        <div className="enq-empty">
          <i className="far fa-envelope-open"></i>
          {search.trim() ? 'No enquiries match your search.' : `No ${tab === 'all' ? '' : STATUS_LABEL[tab as EnquiryStatus].toLowerCase() + ' '}enquiries.`}
        </div>
      ) : (
        <div className="enq-list">
          {enquiries.map((enq) => {
            const open = expanded === enq.id;
            const note = notes[enq.id] ?? enq.admin_note ?? '';
            return (
              <div key={enq.id} className={`enq-card status-${enq.status}`}>
                <div className="enq-card-top">
                  <div className="enq-who">
                    <div className="enq-avatar">{enq.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="enq-name">{enq.name}</div>
                      <div className="enq-when"><i className="far fa-clock"></i> {formatWhen(enq.created_at)}</div>
                    </div>
                  </div>
                  <select
                    className={`enq-status status-${enq.status}`}
                    value={enq.status}
                    disabled={busyId === enq.id}
                    onChange={(e) => void changeStatus(enq, e.target.value as EnquiryStatus)}
                    aria-label={`Status of enquiry from ${enq.name}`}
                  >
                    {(Object.keys(STATUS_LABEL) as EnquiryStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>

                <div className="enq-contact">
                  <a href={`tel:${enq.phone}`}><i className="fas fa-phone"></i> {enq.phone}</a>
                  <a href={`https://wa.me/91${enq.phone.slice(-10)}`} target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp"></i> WhatsApp</a>
                  <a href={`mailto:${enq.email}`}><i className="fas fa-envelope"></i> {enq.email}</a>
                </div>

                <p className={`enq-message${open ? ' open' : ''}`}>{enq.message}</p>

                <div className="enq-actions">
                  <button type="button" className="enq-link" onClick={() => setExpanded(open ? null : enq.id)}>
                    {open ? 'Hide details' : enq.admin_note ? 'View message & note' : 'View message / add note'}
                  </button>
                  <button type="button" className="enq-delete" disabled={busyId === enq.id} onClick={() => void remove(enq)} title="Delete enquiry">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>

                {open ? (
                  <div className="enq-note">
                    <label htmlFor={`enq-note-${enq.id}`}>Internal note (only admins see this)</label>
                    <textarea
                      id={`enq-note-${enq.id}`}
                      rows={3}
                      placeholder="e.g. Called back on 2 Oct, shared 3 listings in Sector 2"
                      value={note}
                      onChange={(e) => setNotes((n) => ({ ...n, [enq.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busyId === enq.id || note === (enq.admin_note ?? '')}
                      onClick={() => void saveNote(enq)}
                    >
                      Save Note
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
