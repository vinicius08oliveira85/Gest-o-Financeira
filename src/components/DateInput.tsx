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
  'aria-invalid': ariaInvalid,
}: DateInputProps) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-invalid={ariaInvalid}
    />
  );
}
