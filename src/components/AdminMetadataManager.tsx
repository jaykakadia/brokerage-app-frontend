import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  getAdminPageMetadata,
  createPageMetadata,
  updatePageMetadata,
  deletePageMetadata,
  getApiErrorMessage
} from '../services/api';
import type { PageMetadata } from '../types';

export interface AdminMetadataManagerProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const COMMON_PAGE_SUGGESTIONS = [
  { path: '/', label: 'Home Page (/)' },
  { path: '/properties/palwal', label: 'Properties in Palwal (/properties/palwal)' },
  { path: '/properties/hodal', label: 'Properties in Hodal (/properties/hodal)' },
  { path: '/properties/hathin', label: 'Properties in Hathin (/properties/hathin)' },
  { path: '/properties/faridabad', label: 'Properties in Faridabad (/properties/faridabad)' },
  { path: '/properties/nuh-mewat', label: 'Properties in Nuh Mewat (/properties/nuh-mewat)' },
  { path: '/business-directory', label: 'Business Directory (/business-directory)' },
  { path: '/cities', label: 'All Indian Cities (/cities)' },
  { path: '/about', label: 'About Us (/about)' },
  { path: '/contact', label: 'Contact Us (/contact)' },
];

export default function AdminMetadataManager({ showToast }: AdminMetadataManagerProps) {
  const [items, setItems] = useState<PageMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PageMetadata | null>(null);
  const [formPath, setFormPath] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPageMetadata();
      setItems(res.data?.data || []);
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to load page metadata list'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAddModal = (presetPath = '') => {
    setEditingItem(null);
    setFormPath(presetPath);
    setFormTitle('');
    setFormDesc('');
    setModalOpen(true);
  };

  const openEditModal = (item: PageMetadata) => {
    setEditingItem(item);
    setFormPath(item.path);
    setFormTitle(item.meta_title);
    setFormDesc(item.meta_description);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormPath('');
    setFormTitle('');
    setFormDesc('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPath = formPath.trim();
    const cleanTitle = formTitle.trim();
    const cleanDesc = formDesc.trim();

    if (!cleanPath) {
      showToast('Please enter a link / path', 'error');
      return;
    }
    if (!cleanTitle) {
      showToast('Please enter Meta Name / Title', 'error');
      return;
    }
    if (!cleanDesc) {
      showToast('Please enter Meta Description', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await updatePageMetadata(editingItem.id, {
          path: cleanPath,
          meta_title: cleanTitle,
          meta_description: cleanDesc,
        });
        showToast('Meta data updated successfully!');
      } else {
        await createPageMetadata({
          path: cleanPath,
          meta_title: cleanTitle,
          meta_description: cleanDesc,
        });
        showToast('Meta data added successfully!');
      }
      closeModal();
      void loadData();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to save meta data'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, path: string) => {
    if (!window.confirm(`Are you sure you want to remove custom meta data for "${path}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deletePageMetadata(id);
      showToast('Meta data removed successfully');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to delete meta data'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.path.toLowerCase().includes(q) ||
        item.meta_title.toLowerCase().includes(q) ||
        item.meta_description.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="admin-metadata-wrap" style={{ padding: '4px 0' }}>
      {/* Top Header & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0' }}>
            <i className="fas fa-tags" style={{ color: '#0d7a5f', marginRight: '8px' }}></i>
            Meta Data Management
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '650px' }}>
            Configure custom <strong>Meta Title</strong> and <strong>Meta Description</strong> for any website landing page link.
            These tags are automatically added to the webpage header for Google Search results and social media sharing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openAddModal()}
          style={{
            background: '#0d7a5f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '13.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <i className="fas fa-plus"></i> Add Meta Data
        </button>
      </div>

      {/* Quick suggestions pill row if fewer than 5 items */}
      {items.length < 5 && (
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-lightbulb" style={{ color: '#eab308' }}></i>
            Quick Suggestions — Click to configure Meta Data for common pages:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMON_PAGE_SUGGESTIONS.filter((s) => !items.some((i) => i.path === s.path)).map((s) => (
              <button
                key={s.path}
                type="button"
                onClick={() => openAddModal(s.path)}
                style={{
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  color: '#0d7a5f',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                + {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <i
            className="fas fa-search"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '13px',
            }}
          ></i>
          <input
            type="text"
            placeholder="Search by link, title, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ fontSize: '12.5px', color: '#64748b' }}>
          Showing <strong>{filteredItems.length}</strong> of {items.length} links configured
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
          <div>Loading meta data...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '50px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: '36px', color: '#cbd5e1', marginBottom: '12px' }}>
            <i className="fas fa-globe"></i>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            {search ? 'No matching meta data found' : 'No custom meta data configured yet'}
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '450px', margin: '0 auto 18px auto' }}>
            {search
              ? `No links match "${search}". Try clearing your search.`
              : 'Add your first landing page link with custom Meta Title and Description for Google search ranking.'}
          </p>
          {!search && (
            <button
              type="button"
              onClick={() => openAddModal('/')}
              style={{
                background: '#0d7a5f',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fas fa-plus"></i> Add Home Page Meta Data (/)
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px 14px', width: '220px', whiteSpace: 'nowrap' }}>1) Link / Page Path</th>
                <th style={{ padding: '12px 14px', minWidth: '240px' }}>2) Meta Name / Title</th>
                <th style={{ padding: '12px 14px', minWidth: '320px' }}>3) Meta Description</th>
                <th style={{ padding: '12px 14px', width: '100px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 600,
                          wordBreak: 'break-all',
                        }}
                      >
                        {item.path}
                      </span>
                      <a
                        href={item.path}
                        target="_blank"
                        rel="noreferrer"
                        title="Open page in new tab"
                        style={{ color: '#0d7a5f', fontSize: '11px' }}
                      >
                        <i className="fas fa-external-link-alt"></i>
                      </a>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                      {item.meta_title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {item.meta_title.length} characters
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top', color: '#475569' }}>
                    <div style={{ lineHeight: 1.45, fontSize: '12.5px', marginBottom: '2px' }}>
                      {item.meta_description}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {item.meta_description.length} characters
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      title="Edit this meta data"
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        marginRight: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <i className="fas fa-edit"></i> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.path)}
                      disabled={deletingId === item.id}
                      title="Delete this meta data"
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      {deletingId === item.id ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fas fa-trash-alt"></i>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add / Edit Meta Data */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-tags" style={{ color: '#0d7a5f', fontSize: '18px' }}></i>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>
                  {editingItem ? 'Edit Meta Data' : 'Add New Meta Data'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
              {/* Field 1: Link */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  1) Link / Page Path <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. / or /properties/palwal or https://tradecall.in/business-directory"
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                  required
                />
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  Enter relative path (e.g. <code>/</code>, <code>/properties/palwal</code>) or full URL. Full domain is automatically normalized.
                </div>
              </div>

              {/* Field 2: Meta Name / Title */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    2) Meta Name / Meta Title <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11.5px', color: formTitle.length > 60 ? '#b45309' : '#64748b' }}>
                    {formTitle.length} / 60 recommended
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Properties in Palwal | Verified Residential & Commercial Real Estate"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              {/* Field 3: Meta Description */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    3) Meta Description <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11.5px', color: formDesc.length > 160 ? '#b45309' : '#64748b' }}>
                    {formDesc.length} / 160 recommended
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder="e.g. Buy, sell or rent flats, plots, houses and commercial property in Palwal with zero brokerage. Contact verified owners directly on TradeCall India."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: 1.45,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              {/* Google Search Live Preview Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  <i className="fab fa-google" style={{ color: '#4285f4', marginRight: '6px' }}></i>
                  Google Search Live Preview
                </div>
                <div style={{ fontSize: '12px', color: '#202124', marginBottom: '2px', wordBreak: 'break-all' }}>
                  https://tradecall.in{formPath ? (formPath.startsWith('/') ? formPath : `/${formPath}`) : '/'}
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#1a0dab',
                    lineHeight: 1.3,
                    marginBottom: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {formTitle || 'Your Page Meta Title Will Appear Here'}
                </div>
                <div style={{ fontSize: '12.5px', color: '#4d5156', lineHeight: 1.4 }}>
                  {formDesc || 'Your page meta description will appear here as the Google search snippet.'}
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: '#0d7a5f',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {saving && <i className="fas fa-spinner fa-spin"></i>}
                  {editingItem ? 'Update Meta Data' : 'Save Meta Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
