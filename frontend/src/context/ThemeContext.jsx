import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('jewelar-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [liteMode, setLiteMode] = useState(() => {
    const saved = localStorage.getItem('jewelar-litemode');
    return saved === 'true';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('jewelar-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('jewelar-litemode', liteMode.toString());
    if (liteMode) {
      document.documentElement.classList.add('lite-mode');
    } else {
      document.documentElement.classList.remove('lite-mode');
    }
  }, [liteMode]);

  const toggle = () => setIsDark((p) => !p);
  const toggleLiteMode = () => setLiteMode((p) => !p);

  return (
    <ThemeContext.Provider value={{ isDark, toggle, liteMode, toggleLiteMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
