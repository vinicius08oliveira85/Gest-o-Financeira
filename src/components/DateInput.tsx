import React, { useState, useEffect } from 'react';

function isoToBR(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function brToISO(br: string): string {
  const parts = br.split('/');
  if (
    parts.length === 3 &&
    parts[0].length === 2 &&
    parts[1].length === 2 &&
    parts[2].length === 4
  ) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return '';
}

type DateInputProps = {
  id?: string;
  value: string;
  onChange: (isoValue: string) => void;
  className?: string;
  placeholder?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

export function DateInput({
  id,
  value,
  onChange,
  className,
  placeholder = 'DD/MM/AAAA',
  'aria-invalid': ariaInvalid,
}: DateInputProps) {
  const [display, setDisplay] = useState(isoToBR(value));

  useEffect(() => {
    setDisplay(isoToBR(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);

    let masked = '';
    if (raw.length > 0) masked += raw.slice(0, 2);
    if (raw.length > 2) masked += '/' + raw.slice(2, 4);
    if (raw.length > 4) masked += '/' + raw.slice(4, 8);

    setDisplay(masked);
    onChange(brToISO(masked));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      aria-invalid={ariaInvalid}
    />
  );
}
