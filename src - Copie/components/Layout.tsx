import React from "react";
import styles from "./Layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className="container">
          <h1 className={styles.logo}>Outil québécois de soutien à la décision clinique lors d'une offre de rein de donneur décédé</h1>
        </div>
      </header>
      <main className={styles.main}>
        <div className="container">{children}</div>
      </main>
      <footer className={styles.footer}>
        <div className="container">
          <p>&copy; 2026 Kidney Transplant Perspective Visualizer</p>
        </div>
      </footer>
    </div>
  );
};
