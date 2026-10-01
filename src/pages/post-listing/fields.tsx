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
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal' | 'url';
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

/** Multi-select version of Pills, e.g. for amenities. */
export function MultiPills({
  label,
  values,
  options,
  onChange
}: {
  label: string;
  values: string[];
  options: readonly string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (option: string): void => {
    onChange(values.includes(option) ? values.filter((v) => v !== option) : [...values, option]);
  };
  return (
    <>
      <label className="form-label">
        {label}
        {values.length > 0 ? <span className="multi-pill-count">{values.length} selected</span> : null}
      </label>
      <div className="pill-group">
        {options.map((option) => (
          <label className="pill-radio multi-pill" key={option}>
            <input type="checkbox" checked={values.includes(option)} onChange={() => toggle(option)} />
            <span>
              {values.includes(option) ? <i className="fas fa-check"></i> : null}
              {option}
            </span>
          </label>
        ))}
      </div>
    </>
  );
}

/** Progress bar showing the current step of a multi-step listing form. */
export function StepIndicator({ steps, current }: { steps: { label: string; icon: string }[]; current: number }) {
  const pct = steps.length > 1 ? ((current - 1) / (steps.length - 1)) * 100 : 100;
  return (
    <div className="wizard-steps" aria-label={`Step ${current} of ${steps.length}`}>
      <div className="wizard-steps-track">
        <div className="wizard-steps-fill" style={{ width: `${pct}%` }} />
      </div>
      <ol className="wizard-steps-list">
        {steps.map((item, i) => {
          const n = i + 1;
          const state = n < current ? 'done' : n === current ? 'active' : 'todo';
          return (
            <li key={item.label} className={`wizard-step ${state}`} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="wizard-step-dot">
                {state === 'done' ? <i className="fas fa-check"></i> : <i className={item.icon}></i>}
              </span>
              <span className="wizard-step-label">{item.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="wizard-steps-mobile">
        Step {current} of {steps.length} · <strong>{steps[current - 1]?.label}</strong>
      </div>
    </div>
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

export interface ContactLinkFields {
  mobile: string;
  whatsapp: string;
  sameAsMobile: boolean;
  facebookUrl: string;
  websiteUrl: string;
  xUrl: string;
}

const tenDigits = (value: string): string => value.replace(/\D/g, '').slice(0, 10);

/** Mobile and WhatsApp side by side, with a "same as mobile" checkbox that keeps them in sync. */
export function PhoneWhatsAppFields({
  mobile,
  whatsapp,
  sameAsMobile,
  onChange
}: Pick<ContactLinkFields, 'mobile' | 'whatsapp' | 'sameAsMobile'> & {
  onChange: (patch: Partial<Pick<ContactLinkFields, 'mobile' | 'whatsapp' | 'sameAsMobile'>>) => void;
}) {
  return (
    <>
      <div className="bf-row keep-row contact-pair">
        <FloatField
          label="Mobile Number"
          icon="fas fa-phone"
          required
          type="tel"
          inputMode="tel"
          maxLength={10}
          value={mobile}
          onChange={(value) => {
            const next = tenDigits(value);
            onChange(sameAsMobile ? { mobile: next, whatsapp: next } : { mobile: next });
          }}
        />
        <FloatField
          label="WhatsApp Number"
          icon="fab fa-whatsapp"
          type="tel"
          inputMode="tel"
          maxLength={10}
          readOnly={sameAsMobile}
          value={sameAsMobile ? mobile : whatsapp}
          onChange={(value) => onChange({ whatsapp: tenDigits(value) })}
        />
      </div>
      <label className="checkbox-label contact-pair-check">
        <input
          type="checkbox"
          checked={sameAsMobile}
          onChange={(e) => onChange(e.target.checked ? { sameAsMobile: true, whatsapp: mobile } : { sameAsMobile: false })}
        />
        WhatsApp number same as mobile number
      </label>
    </>
  );
}

/** Optional social links block shared by the listing forms. */
export function SocialLinkFields({
  facebookUrl,
  websiteUrl,
  xUrl,
  onChange
}: Pick<ContactLinkFields, 'facebookUrl' | 'websiteUrl' | 'xUrl'> & {
  onChange: (patch: Partial<Pick<ContactLinkFields, 'facebookUrl' | 'websiteUrl' | 'xUrl'>>) => void;
}) {
  return (
    <div className="social-links-box">
      <div className="social-links-title">
        <i className="fas fa-share-alt"></i> Social Links
      </div>
      <FloatField label="Facebook Link" icon="fab fa-facebook-f" inputMode="url" value={facebookUrl} onChange={(value) => onChange({ facebookUrl: value })} />
      <FloatField label="Website Link" icon="fas fa-globe" inputMode="url" value={websiteUrl} onChange={(value) => onChange({ websiteUrl: value })} />
      <FloatField label="X (Twitter) Link" icon="fab fa-x-twitter" inputMode="url" value={xUrl} onChange={(value) => onChange({ xUrl: value })} />
    </div>
  );
}
