import { useId } from 'react';
import Select from 'react-select';
import '../styles/MembershipBillingSelect.css';

interface BillingOption {
  value: string;
  label: string;
}

export function MembershipBillingSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: BillingOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="ap-field">
      <label htmlFor={id}>{label}</label>
      <Select<BillingOption>
        inputId={id}
        className="ap-select"
        classNamePrefix="ap-select"
        unstyled
        isSearchable={false}
        isDisabled={disabled}
        options={options}
        value={options.find((option) => option.value === value) || null}
        onChange={(option) => {
          if (option) onChange(option.value);
        }}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        menuShouldScrollIntoView={false}
        maxMenuHeight={240}
        noOptionsMessage={() => 'Sin opciones'}
      />
    </div>
  );
}
