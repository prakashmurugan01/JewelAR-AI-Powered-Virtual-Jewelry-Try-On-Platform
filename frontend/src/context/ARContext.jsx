import React, { createContext, useContext, useState, useCallback } from 'react';

const ARContext = createContext(null);

export function ARProvider({ children }) {
  const [landmarks, setLandmarks] = useState([]);
  const [earDetections, setEarDetections] = useState({ left: null, right: null });
  const [neckDetections, setNeckDetections] = useState(null);
  const [poseNeck, setPoseNeck] = useState(null);
  const [handLandmarks, setHandLandmarks] = useState(null);
  const [selectedJewelry, setSelectedJewelry] = useState({});
  const [faceMetrics, setFaceMetrics] = useState({});
  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const selectJewelry = useCallback((category, item) => {
    setSelectedJewelry(prev => {
      if (prev[category]?.id === item.id) {
        const next = { ...prev };
        delete next[category];
        return next;
      }
      return { ...prev, [category]: item };
    });
  }, []);

  const clearJewelry = useCallback((category) => {
    if (category) {
      setSelectedJewelry(prev => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
    } else {
      setSelectedJewelry({});
    }
  }, []);

  const value = {
    landmarks, setLandmarks,
    earDetections, setEarDetections,
    neckDetections, setNeckDetections,
    poseNeck, setPoseNeck,
    handLandmarks, setHandLandmarks,
    selectedJewelry, selectJewelry, clearJewelry,
    faceMetrics, setFaceMetrics,
    isDetecting, setIsDetecting,
    faceDetected, setFaceDetected,
    debugMode, setDebugMode,
  };

  return <ARContext.Provider value={value}>{children}</ARContext.Provider>;
}

export function useAR() {
  const ctx = useContext(ARContext);
  if (!ctx) throw new Error('useAR must be used within ARProvider');
  return ctx;
}

export default ARContext;
