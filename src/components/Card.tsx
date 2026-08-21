import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: string;
  description?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, description, headerRight, children, className = '' }) => {
  return (
    <div className={[styles.card, className].join(' ')}>
      {(title || description || headerRight) && (
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerLeft}>
              {title && <h3 className={styles.title}>{title}</h3>}
              {description && <p className={styles.description}>{description}</p>}
            </div>
            {headerRight && <div className={styles.headerRight}>{headerRight}</div>}
          </div>
        </div>
      )}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};
