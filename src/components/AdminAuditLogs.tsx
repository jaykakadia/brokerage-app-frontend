import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminAuditLogs,
  getAdminAuditTables,
  getApiErrorMessage,
  type AuditLog,
  type AuditLogChange
} from '../services/api';

export interface AdminAuditLogsProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function AdminAuditLogs({ showToast }: AdminAuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Diff Modal
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const loadTables = useCallback(async () => {
    try {
      const res = await getAdminAuditTables();
      setTables(res.data?.data || []);
    } catch {
      // Optional fallback
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminAuditLogs({
        table_name: selectedTable === 'all' ? undefined : selectedTable,
        action: selectedAction === 'all' ? undefined : selectedAction,
        search: searchQuery.trim() || undefined,
        page,
        limit
      });
      const data = res.data?.data;
      if (data) {
        setLogs(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, 'Failed to fetch audit logs'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTable, selectedAction, searchQuery, page, limit, showToast]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchTerm);
  };

  const handleClearFilters = () => {
    setSelectedTable('all');
    setSelectedAction('all');
    setSearchTerm('');
    setSearchQuery('');
    setPage(1);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  const getActionBadge = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act === 'CREATE') {
      return {
        bg: '#dcfce7',
        color: '#15803d',
        border: '#86efac',
        icon: 'fas fa-plus-circle',
        label: 'CREATED'
      };
    }
    if (act === 'SOFT_DELETE') {
      return {
        bg: '#fee2e2',
        color: '#b91c1c',
        border: '#fca5a5',
        icon: 'fas fa-trash-alt',
        label: 'SOFT DELETED'
      };
    }
    if (act === 'RESTORE') {
      return {
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fde68a',
        icon: 'fas fa-trash-restore',
        label: 'RESTORED'
      };
    }
    return {
      bg: '#dbeafe',
      color: '#1d4ed8',
      border: '#bfdbfe',
      icon: 'fas fa-edit',
      label: 'UPDATED'
    };
  };

  const renderValuePreview = (val: any, maxLength = 24): string => {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'boolean') return val ? 'True' : 'False';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return `[${val.length} item${val.length === 1 ? '' : 's'}]`;
      }
      const keysCount = Object.keys(val).length;
      return `{${keysCount} field${keysCount === 1 ? '' : 's'}}`;
    }
    const str = String(val);
    return str.length > maxLength ? str.slice(0, Math.max(maxLength - 3, 3)) + '...' : str;
  };

  const getFullValueTooltip = (val: any): string => {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const renderModalValue = (val: any) => {
    if (val === null || val === undefined) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>None</span>;
    }
    if (typeof val === 'object') {
      try {
        return (
          <pre
            style={{
              margin: 0,
              fontSize: '11px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '180px',
              overflowY: 'auto',
              background: 'transparent'
            }}
          >
            {JSON.stringify(val, null, 2)}
          </pre>
        );
      } catch {
        return String(val);
      }
    }
    if (typeof val === 'boolean') {
      return val ? 'True' : 'False';
    }
    return String(val);
  };

  const renderInlineSummary = (changes?: Record<string, AuditLogChange> | null, log?: AuditLog) => {
    if (!changes || Object.keys(changes).length === 0) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>No field diff recorded</span>;
    }
    const keys = Object.keys(changes);
    const previewKeys = keys.slice(0, 2);
    const remaining = keys.length - 2;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '100%' }}>
        {previewKeys.map((k) => {
          const oldVal = changes[k]?.old;
          const newVal = changes[k]?.new;
          const oldStr = renderValuePreview(oldVal, 16);
          const newStr = renderValuePreview(newVal, 16);
          const tooltip = `${k}:\nEarlier: ${getFullValueTooltip(oldVal)}\nUpdated: ${getFullValueTooltip(newVal)}`;

          return (
            <div
              key={k}
              title={tooltip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                lineHeight: '1.3',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
            >
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  background: '#f1f5f9',
                  color: '#334155',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '10.5px',
                  flexShrink: 0
                }}
              >
                {k}:
              </span>
              <span
                style={{
                  color: '#dc2626',
                  textDecoration: 'line-through',
                  background: '#fef2f2',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  maxWidth: '90px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 1
                }}
              >
                {oldStr}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '10px', flexShrink: 0 }}>&rarr;</span>
              <span
                style={{
                  color: '#16a34a',
                  fontWeight: 600,
                  background: '#f0fdf4',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  maxWidth: '110px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 1
                }}
              >
                {newStr}
              </span>
            </div>
          );
        })}
        {remaining > 0 && (
          <div>
            <button
              type="button"
              onClick={() => log && setActiveLog(log)}
              style={{
                border: 'none',
                background: '#eff6ff',
                color: '#2563eb',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#dbeafe')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#eff6ff')}
            >
              +{remaining} more changed {remaining === 1 ? 'field' : 'fields'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-audit-logs" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: '#fff',
          padding: '18px 24px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 10px', borderRadius: '8px', fontSize: '15px' }}>
              <i className="fas fa-history"></i>
            </span>
            Audit &amp; Change Logs
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Tracks every data creation, field update (<b>earlier value &rarr; updated value</b>), and soft deletion across listings, users, categories, locations, and more.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => void loadLogs()}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '6px 14px' }}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#fff',
          padding: '14px 20px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        {/* Table Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="audit-table-filter" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
            Entity:
          </label>
          <select
            id="audit-table-filter"
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '6px 10px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontWeight: 500
            }}
          >
            <option value="all">All Entities</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Action Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label htmlFor="audit-action-filter" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
            Action:
          </label>
          <select
            id="audit-action-filter"
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '6px 10px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontWeight: 500
            }}
          >
            <option value="all">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="SOFT_DELETE">SOFT DELETE</option>
            <option value="RESTORE">RESTORE</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', flex: '1 1 240px' }}>
          <input
            type="text"
            placeholder="Search by record name, email, table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1'
            }}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: '6px' }}
          >
            <i className="fas fa-search"></i>
          </button>
        </form>

        {(selectedTable !== 'all' || selectedAction !== 'all' || searchQuery) && (
          <button
            type="button"
            className="btn-outline"
            onClick={handleClearFilters}
            style={{ padding: '6px 10px', fontSize: '11.5px', color: '#64748b' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px', tableLayout: 'fixed', minWidth: '1050px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px', width: '185px' }}>Timestamp</th>
                <th style={{ padding: '12px 14px', width: '125px' }}>Action</th>
                <th style={{ padding: '12px 14px', width: '125px' }}>Entity</th>
                <th style={{ padding: '12px 16px', width: '180px' }}>Record / Title</th>
                <th style={{ padding: '12px 16px', width: '160px' }}>Changed By</th>
                <th style={{ padding: '12px 16px' }}>Changes Preview</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-clipboard-list" style={{ fontSize: '28px', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}></i>
                    No audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '12px 18px', color: '#64748b', fontSize: '11.5px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {formatTimestamp(log.created_at)}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <i className={badge.icon}></i> {badge.label}
                        </span>
                      </td>

                      {/* Entity */}
                      <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#334155',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {log.table_name}
                        </span>{' '}
                        <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '2px' }}>#{log.record_id}</span>
                      </td>

                      {/* Record Name */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={log.record_name || ''}
                        >
                          {log.record_name || `${log.table_name} #${log.record_id}`}
                        </div>
                      </td>

                      {/* Changed By */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.actor_email || 'System'}>
                          {log.actor_email || 'System'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          Role: <span style={{ textTransform: 'capitalize' }}>{log.actor_role || 'system'}</span>
                          {log.ip_address && <span style={{ marginLeft: '4px' }}>&bull; {log.ip_address}</span>}
                        </div>
                      </td>

                      {/* Changes Inline Preview */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        {renderInlineSummary(log.changes, log)}
                      </td>

                      {/* View Diff Button */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => setActiveLog(log)}
                          className="btn-outline"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            borderRadius: '5px',
                            borderColor: '#cbd5e1',
                            color: '#1e293b',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="fas fa-eye"></i> Diff
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#64748b',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
            {Math.min(page * limit, total)} of <b>{total}</b> audit log entries
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn-outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '4px 10px', fontSize: '11.5px' }}
            >
              <i className="fas fa-chevron-left" style={{ marginRight: '4px' }}></i> Previous
            </button>
            <span style={{ padding: '4px 8px', fontWeight: 600, color: '#334155' }}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className="btn-outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '4px 10px', fontSize: '11.5px' }}
            >
              Next <i className="fas fa-chevron-right" style={{ marginLeft: '4px' }}></i>
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED DIFF MODAL */}
      {activeLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setActiveLog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      ...getActionBadge(activeLog.action),
                      padding: '2px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {getActionBadge(activeLog.action).label}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    Audit Log #{activeLog.id}
                  </h3>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Table: <b>{activeLog.table_name}</b> &bull; Record ID: <b>#{activeLog.record_id}</b> &bull;{' '}
                  {formatTimestamp(activeLog.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Metadata Summary */}
            <div
              style={{
                padding: '12px 20px',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                fontSize: '12px'
              }}
            >
              <div>
                <span style={{ color: '#64748b' }}>Target Name:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{activeLog.record_name || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Modified By:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{activeLog.actor_email || 'System'}</strong> (
                {activeLog.actor_role || 'system'})
              </div>
              {activeLog.ip_address && (
                <div>
                  <span style={{ color: '#64748b' }}>IP Address:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{activeLog.ip_address}</strong>
                </div>
              )}
            </div>

            {/* Modal Body - Detailed Diff Table */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                Field-by-Field Value Comparison:
              </h4>

              {!activeLog.changes || Object.keys(activeLog.changes).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                  No field-level changes captured for this action.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '8px 12px', width: '140px' }}>Field</th>
                      <th style={{ padding: '8px 12px' }}>Earlier Value (Before)</th>
                      <th style={{ padding: '8px 12px' }}>Updated Value (After)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(activeLog.changes).map(([field, diff]) => (
                      <tr key={field} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>
                          {field}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div
                            style={{
                              background: diff?.old !== null && diff?.old !== undefined ? '#fef2f2' : '#f8fafc',
                              color: diff?.old !== null && diff?.old !== undefined ? '#991b1b' : '#94a3b8',
                              border: diff?.old !== null && diff?.old !== undefined ? '1px solid #fecaca' : '1px dashed #cbd5e1',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              wordBreak: 'break-word'
                            }}
                          >
                            {renderModalValue(diff?.old)}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div
                            style={{
                              background: diff?.new !== null && diff?.new !== undefined ? '#f0fdf4' : '#f8fafc',
                              color: diff?.new !== null && diff?.new !== undefined ? '#166534' : '#94a3b8',
                              border: diff?.new !== null && diff?.new !== undefined ? '1px solid #bbf7d0' : '1px dashed #cbd5e1',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              wordBreak: 'break-word'
                            }}
                          >
                            {renderModalValue(diff?.new)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#f8fafc'
              }}
            >
              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveLog(null)}
                style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '6px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

