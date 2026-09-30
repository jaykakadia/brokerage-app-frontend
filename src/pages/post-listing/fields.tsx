import { useEffect, useRef, useState, type ReactNode } from 'react';
import api from '../../services/api';
import type { ApiResponse, RefCodeItem } from '../../types';

export function FloatField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  icon,
  prefix,
  readOnly = false,
  maxLength,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  icon?: string;
  prefix?: string;
  readOnly?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal';
}) {
  return (
    <div className={`premium-float${prefix ? ' input-with-prefix' : ''}`}>
      {prefix ? <span className="prefix">{prefix}</span> : null}
      <input
        type={type}
        placeholder=" "
        value={value}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
      />
      <label>
        {label}
        {required ? <span style={{ color: '#dc2626' }}> *</span> : null}
      </label>
      {icon ? <i className={`${icon} field-icon`} /> : null}
    </div>
  );
}

export function FloatSelect({
  label,
  value,
  onChange,
  children,
  required = false,
  icon
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
  icon?: string;
}) {
  return (
    <div className="premium-float">
      <select
        className={`premium-select${value ? ' is-filled' : ''}`}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled></option>
        {children}
      </select>
      <label className="select-label">
        {label}
        {required ? <span style={{ color: '#dc2626' }}> *</span> : null}
      </label>
      {icon ? <i className={`${icon} field-icon`} /> : null}
    </div>
  );
}

export function Pills<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <>
      <label className="form-label">{label}</label>
      <div className="pill-group">
        {options.map((option) => (
          <label className="pill-radio" key={option.value}>
            <input
              type="radio"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </>
  );
}

/** Search box that suggests Business Associate names / reference codes as the user types. */
export function RefCodeSearch({
  value,
  onChange,
  onSelect
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: RefCodeItem) => void;
}) {
  const [suggestions, setSuggestions] = useState<RefCodeItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const query = value.trim();
    if (!query) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      api.get<ApiResponse<RefCodeItem[]>>('/api/v1/employees/ref-codes', { params: { q: query } })
        .then((res) => {
          if (cancelled) return;
          setSuggestions(Array.isArray(res.data?.data) ? res.data.data.slice(0, 8) : []);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => { if (!cancelled) setSuggestions([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const choose = (item: RefCodeItem) => {
    skipNextFetch.current = true;
    onSelect(item);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const highlight = (text: string) => {
    const query = value.trim();
    const idx = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong style={{ color: '#0c6253' }}>{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }} onKeyDown={onKeyDown}>
      <FloatField label="Search by Name or Ref Code" value={value} onChange={onChange} />
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            boxShadow: '0 10px 30px rgba(15,23,42,0.12)', maxHeight: 260, overflowY: 'auto'
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>
              {loading ? 'Searching…' : 'No matching name or code'}
            </div>
          ) : suggestions.map((item, i) => (
            <button
              key={item.reference_code}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', border: 'none', borderBottom: '1px solid #f1f5f9', textAlign: 'left',
                background: i === active ? '#f0faf7' : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#111827'
              }}
            >
              <span><i className="fas fa-user" style={{ color: '#94a3b8', marginRight: 8, fontSize: 12 }}></i>{highlight(item.name)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0c6253', background: '#ecfdf5', padding: '2px 8px', borderRadius: 6 }}>
                {highlight(item.reference_code)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
