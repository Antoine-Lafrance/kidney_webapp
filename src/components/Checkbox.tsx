import React from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', checked, onChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e);
    }
  };
  
  return (
    <div className={styles.container}>
      <input 
        type='checkbox' 
        className={[styles.checkbox, className].join(' ')} 
        checked={checked}
        onChange={handleChange}
        {...props} 
      />
      {label && <label className={styles.label}>{label}</label>}
    </div>
  );
};
