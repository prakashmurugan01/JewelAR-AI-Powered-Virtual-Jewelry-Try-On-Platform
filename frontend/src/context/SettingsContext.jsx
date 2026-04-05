import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function SettingsProvider({ children }) {
  const [liteMode, setLiteMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Initialize from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jewelar-litemode');
      if (saved !== null) {
        setLiteMode(saved === 'true');
      } else {
        // Check system preference
        setLiteMode(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    } catch (err) {
      console.warn('Failed to read localStorage:', err);
    }
    setLoaded(true);
  }, []);

  const [autoPlay, setAutoPlay] = useState(true);
  const [imageQuality, setImageQuality] = useState('high');

  // Save lite mode preference
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('jewelar-litemode', liteMode.toString());
      if (liteMode) {
        document.documentElement.style.setProperty('--animation-duration', '0s');
        document.documentElement.classList.add('lite-mode');
      } else {
        document.documentElement.style.removeProperty('--animation-duration');
        document.documentElement.classList.remove('lite-mode');
      }
    } catch (err) {
      console.warn('Failed to save liteMode:', err);
    }
  }, [liteMode, loaded]);

  // Save autoplay preference
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('jewelar-autoplay', autoPlay.toString());
    } catch (err) {
      console.warn('Failed to save autoPlay:', err);
    }
  }, [autoPlay, loaded]);

  // Save image quality preference
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('jewelar-quality', imageQuality);
    } catch (err) {
      console.warn('Failed to save imageQuality:', err);
    }
  }, [imageQuality, loaded]);

  const value = {
    // Lite Mode: Disable animations, reduce motion
    liteMode,
    setLiteMode,
    
    // Auto Play: Auto-start videos/animations
    autoPlay,
    setAutoPlay,
    
    // Image Quality: low/medium/high
    imageQuality,
    setImageQuality,
    
    // Helper: Get animation config
    getAnimationConfig: () => ({
      duration: liteMode ? 0 : 0.3,
      transition: liteMode ? { delay: 0 } : { delay: 0.1 },
    }),
    
    // Helper: Check if animations should be disabled
    shouldAnimate: () => !liteMode,
    
    // Helper: Get image optimization settings
    getImageSettings: () => {
      const qualityMap = {
        low: { width: 300, height: 300, quality: 60 },
        medium: { width: 500, height: 500, quality: 80 },
        high: { width: 800, height: 800, quality: 95 },
      };
      return qualityMap[imageQuality] || qualityMap.high;
    },
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
