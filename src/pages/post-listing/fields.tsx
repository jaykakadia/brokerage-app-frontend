import type { ReactNode } from 'react';

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
