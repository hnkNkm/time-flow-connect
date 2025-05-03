import React from "react";

interface InputProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const TextInput: React.FC<InputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = "",
  required = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
    </div>
  );
};

export const DateInput: React.FC<InputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        type="date"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
    </div>
  );
};

export const DateTimeInput: React.FC<InputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        type="datetime-local"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
    </div>
  );
};

export const TimeInput: React.FC<InputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        type="time"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
    </div>
  );
};

interface SelectProps {
  id: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  label: string;
  options: { value: string | number; label: string }[];
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SelectBox: React.FC<SelectProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  options,
  required = false,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

interface TextAreaProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = "",
  required = false,
  disabled = false,
  className = "",
  rows = 3,
}) => {
  return (
    <div className={`form-group ${className}`}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );
};
