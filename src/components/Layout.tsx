import React from "react";
import styles from "./Layout.module.css";

type Language = "fr" | "en";

interface LayoutProps {
  children: React.ReactNode;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, language, onLanguageChange }) => {
  const title = language === "fr"
    ? "Outil de soutien à la décision clinique lors d’une offre de rein par transplant Québéc."
    : "Clinical Decision Support Tool for a Kidney Offer by Transplant Québec.";

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerRow}>
            <h1 className={styles.logo}>{title}</h1>
            <div className={styles.languageSwitch} aria-label="Language switch">
              <button
                type="button"
                className={language === "fr" ? styles.activeLanguage : styles.languageButton}
                onClick={() => onLanguageChange("fr")}
              >
                FR
              </button>
              <button
                type="button"
                className={language === "en" ? styles.activeLanguage : styles.languageButton}
                onClick={() => onLanguageChange("en")}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className="container">{children}</div>
      </main>
    </div>
  );
};
