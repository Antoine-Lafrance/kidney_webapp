import React from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', checked, onChange, ...props }) => {
  const generatedId = React.useId();
  const checkboxId = props.id ?? generatedId;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
  };
  
  return (
    <div className={styles.container}>
      <input 
        type='checkbox' 
        id={checkboxId}
        className={[styles.checkbox, className].join(' ')} 
        checked={checked}
        onChange={handleChange}
        {...props} 
      />
      {label && (
        <label htmlFor={checkboxId} className={styles.label}>
          {label}
        </label>
      )}
    </div>
  );
};
