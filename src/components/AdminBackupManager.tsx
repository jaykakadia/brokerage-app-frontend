import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAdminBackupStats,
  downloadAdminBackup,
  restoreAdminBackup,
  getApiErrorMessage,
  type BackupStats,
  type BackupRestoreResult
} from '../services/api';

export interface AdminBackupManagerProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminBackupManager({ showToast }: AdminBackupManagerProps) {
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'upsert'>('replace');
  const [restoring, setRestoring] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [restoreResult, setRestoreResult] = useState<BackupRestoreResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await getAdminBackupStats();
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to load backup statistics'), 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      showToast('Generating full backup archive (tables & media)...', 'success');
      await downloadAdminBackup();
      showToast('Backup archive downloaded successfully!', 'success');
      void loadStats();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to download backup archive'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        showToast('Please select a valid .zip backup archive', 'error');
        return;
      }
      setSelectedFile(file);
      setRestoreResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        showToast('Please select a valid .zip backup archive', 'error');
        return;
      }
      setSelectedFile(file);
      setRestoreResult(null);
    }
  };

  const triggerRestore = async () => {
    if (!selectedFile) return;
    setConfirmModalOpen(false);
    setRestoring(true);
    setRestoreResult(null);

    try {
      showToast('Uploading and restoring database tables and media files...', 'success');
      const res = await restoreAdminBackup(selectedFile, restoreMode);
      if (res.data?.data) {
        setRestoreResult(res.data.data);
        showToast(res.data.message || 'Backup restored successfully!', 'success');
      }
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      void loadStats();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Backup restoration failed'), 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="admin-content" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            <i className="fas fa-database" style={{ marginRight: '10px', color: '#0c6253' }}></i>
            System Backup & Data Restore
          </h1>
          <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: '14px' }}>
            Download complete system data (all database tables + uploaded images) or upload an archive to restore.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => void loadStats()}
          disabled={loadingStats}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <i className={`fas fa-sync-alt ${loadingStats ? 'fa-spin' : ''}`}></i>
          Refresh Stats
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Database Tables</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0c6253', marginTop: '6px' }}>
            {stats ? stats.total_tables : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Registered models</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total DB Records</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginTop: '6px' }}>
            {stats ? stats.total_records.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Across all system tables</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Uploaded Media Files</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#2563eb', marginTop: '6px' }}>
            {stats ? stats.images_count.toLocaleString() : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Listing photos & assets</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Storage Footprint</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#d97706', marginTop: '6px' }}>
            {stats ? stats.images_size_formatted : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Backend: {stats?.storage_backend || 'local'}</div>
        </div>
      </div>

      {/* Main Grid: Export and Import Side by Side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* DOWNLOAD / EXPORT CARD */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ecfdf5', color: '#0c6253', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <i className="fas fa-cloud-download-alt"></i>
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Download Full System Data
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Generates a comprehensive .zip backup package
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }}>
              This downloads an archive containing the <strong>entire database</strong> (all tables in portable JSON) together with <strong>all uploaded images and media files</strong>.
            </p>

            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981', marginRight: '6px' }}></i> Included in Archive:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#64748b', lineHeight: '1.7' }}>
                <li>All 17 database tables (users, listings, locations, categories, blogs, etc.)</li>
                <li>All uploaded listing photos, blog banners, and user files</li>
                <li>Checksum manifest with export metadata & counts</li>
                <li>Portable across SQLite, PostgreSQL, and staging/production servers</li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              padding: '14px 20px',
              fontSize: '15px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: '#0c6253',
              borderColor: '#0c6253',
              width: '100%'
            }}
          >
            {downloading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Packaging and Downloading...
              </>
            ) : (
              <>
                <i className="fas fa-file-archive"></i>
                Download Full Backup (.zip)
              </>
            )}
          </button>
        </div>

        {/* RESTORE / IMPORT CARD */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                  Upload & Restore System Data
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Restores database tables and images from a .zip backup
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: selectedFile ? '#f0fdf4' : '#fafafa',
                borderColor: selectedFile ? '#86efac' : '#cbd5e1',
                marginBottom: '16px',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {selectedFile ? (
                <div>
                  <i className="fas fa-file-archive" style={{ fontSize: '32px', color: '#16a34a', marginBottom: '8px' }}></i>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop another file to change
                  </div>
                </div>
              ) : (
                <div>
                  <i className="fas fa-file-upload" style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '8px' }}></i>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                    Click to select or drag and drop a backup .zip file
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Accepts official TradeCall backup archives (.zip)
                  </div>
                </div>
              )}
            </div>

            {/* Mode Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '8px' }}>
                Restoration Mode:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${restoreMode === 'replace' ? '#0c6253' : '#e2e8f0'}`,
                    background: restoreMode === 'replace' ? '#f0fdf9' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>Clean Restore</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Wipes existing rows & restores clean state</div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${restoreMode === 'upsert' ? '#0c6253' : '#e2e8f0'}`,
                    background: restoreMode === 'upsert' ? '#f0fdf9' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="upsert"
                    checked={restoreMode === 'upsert'}
                    onChange={() => setRestoreMode('upsert')}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>Merge / Upsert</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Updates matching IDs & adds new rows</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setConfirmModalOpen(true)}
            disabled={!selectedFile || restoring}
            style={{
              padding: '14px 20px',
              fontSize: '15px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: selectedFile ? '#2563eb' : '#94a3b8',
              borderColor: selectedFile ? '#2563eb' : '#94a3b8',
              width: '100%'
            }}
          >
            {restoring ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Restoring Data & Images...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Upload & Restore Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Restoration Result Banner */}
      {restoreResult && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#16a34a', fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '20px' }}></i>
            Restoration Completed Successfully!
          </div>
          <div style={{ fontSize: '14px', color: '#166534', marginBottom: '12px' }}>
            Restored <strong>{restoreResult.total_records.toLocaleString()}</strong> records across {Object.keys(restoreResult.tables_restored).length} tables and <strong>{restoreResult.images_restored.toLocaleString()}</strong> media files from <em>{restoreResult.filename}</em> in <code>{restoreResult.mode}</code> mode.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(restoreResult.tables_restored).map(([tbl, cnt]) => (
              <span key={tbl} style={{ background: '#dcfce7', color: '#15803d', fontSize: '12px', padding: '4px 8px', borderRadius: '6px', fontWeight: '500' }}>
                {tbl}: <strong>{cnt}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Table Breakdown Accordion */}
      {stats && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 16px' }}>
            <i className="fas fa-table" style={{ marginRight: '8px', color: '#64748b' }}></i>
            Current Database Table Inventory
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {Object.entries(stats.tables).map(([tableName, count]) => (
              <div
                key={tableName}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>{tableName}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0c6253', background: '#e6f4f1', padding: '2px 8px', borderRadius: '10px' }}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '16px' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px' }}></i>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#1e293b' }}>Confirm Data Restoration</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }}>
              You are about to restore <strong>{selectedFile?.name}</strong> using <strong>{restoreMode === 'replace' ? 'Clean Replace' : 'Merge / Upsert'}</strong> mode.
            </p>
            {restoreMode === 'replace' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#991b1b', marginBottom: '20px' }}>
                <strong>Warning:</strong> Clean Replace will delete current records in the database and replace them with the records from the backup file. Your admin session will be preserved.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void triggerRestore()}
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
              >
                Yes, Restore Data Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

