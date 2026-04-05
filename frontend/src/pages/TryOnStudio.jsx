import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAR } from '../context/ARContext';
import { getCategories, getJewelryItems } from '../services/jewelry';
import { detectNeck, saveTryOnSnapshot } from '../services/tryon';
import WebcamCapture from '../components/ar/WebcamCapture';
import JewelryOverlay from '../components/ar/JewelryOverlay';
import { HiCamera, HiEye, HiEyeOff, HiRefresh, HiX } from 'react-icons/hi';

const CATEGORY_ICONS = {
  earrings: '💎', earring: '💎', necklace: '📿', necklaces: '📿',
  'nose-pin': '👃', 'nose_pin': '👃', 'nethi-chudi': '👑',
  'nethi_chudi': '👑', ring: '💍', rings: '💍', bangle: '🔅', bangles: '🔅',
  'nose-pins': '\uD83D\uDC43',
};

export default function TryOnStudio() {
  const {
    selectedJewelry, selectJewelry, clearJewelry,
    landmarks, setLandmarks, setFaceMetrics,
    earDetections,
    neckDetections, setNeckDetections,
    poseNeck, setPoseNeck,
    handLandmarks, setHandLandmarks,
    faceDetected, setFaceDetected,
    debugMode, setDebugMode,
  } = useAR();

  const [categories, setCategories] = useState([]);
  const [jewelry, setJewelry] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const canvasRef = useRef(null);
  const neckCaptureCanvasRef = useRef(null);
  const snapshotCanvasRef = useRef(null);
  const neckRequestInFlightRef = useRef(false);
  const cameraControlRef = useRef(null);
  const lastLandmarkUpdateRef = useRef(Date.now());
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [catRes, jewRes] = await Promise.all([
        getCategories().catch(() => ({ data: [] })),
        getJewelryItems().catch(() => ({ data: { results: [] } })),
      ]);
      const cats = catRes.data?.results || catRes.data || [];
      setCategories(cats);
      if (cats.length > 0) setActiveCategory(cats[0].slug);

      const items = jewRes.data?.results || jewRes.data || [];
      setJewelry(items);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const filteredJewelry = activeCategory
    ? jewelry.filter(j => j.category_slug === activeCategory)
    : jewelry;

  const selectedCategorySlugs = Object.keys(selectedJewelry).map(category =>
    category.toLowerCase().replace(/[\s_]+/g, '-')
  );
  const hasRingSelected = selectedCategorySlugs.some(category =>
    (category.includes('ring') || category.includes('rings')) && !category.includes('earring')
  );
  const hasBangleSelected = selectedCategorySlugs.some(category =>
    category.includes('bangle')
  );
  const hasNecklaceSelected = selectedCategorySlugs.some(category =>
    category.includes('necklace')
  );
  const needsHandTracking = hasRingSelected || hasBangleSelected;
  const handTracked = Boolean(
    Array.isArray(handLandmarks)
    && handLandmarks.some(hand => Array.isArray(hand) && hand.length >= 21)
  );
  const handTrackingWarning = cameraOn && needsHandTracking && !handTracked;
  const handTrackingLabel = hasRingSelected && hasBangleSelected
    ? 'ring or bangle'
    : hasRingSelected
      ? 'ring'
      : 'bangle';
  const hasPrimaryHolisticNeck = Boolean(
    poseNeck
    && poseNeck.source === 'holistic'
    && poseNeck.confidence > 0.7
  );
  const neckTracked = Boolean(
    hasNecklaceSelected
    && (
      (poseNeck && poseNeck.confidence > 0.25)
      || (neckDetections && neckDetections.confidence > 0.35)
    )
  );

  useEffect(() => {
    if (!hasNecklaceSelected || !faceDetected || hasPrimaryHolisticNeck) {
      setNeckDetections(null);
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    const detectNeckLoop = async () => {
      if (cancelled) return;

      const video = cameraControlRef.current?.videoElement;
      if (!video || video.readyState < 2 || neckRequestInFlightRef.current) {
        timeoutId = window.setTimeout(detectNeckLoop, 500);
        return;
      }

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      if (!sourceWidth || !sourceHeight) {
        timeoutId = window.setTimeout(detectNeckLoop, 500);
        return;
      }

      try {
        neckRequestInFlightRef.current = true;

        const captureCanvas = neckCaptureCanvasRef.current || document.createElement('canvas');
        neckCaptureCanvasRef.current = captureCanvas;

        const targetWidth = Math.min(480, sourceWidth);
        const targetHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * targetWidth));
        captureCanvas.width = targetWidth;
        captureCanvas.height = targetHeight;

        const captureCtx = captureCanvas.getContext('2d', { alpha: false });
        if (!captureCtx) {
          return;
        }

        captureCtx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const frameDataUrl = captureCanvas.toDataURL('image/jpeg', 0.72);
        const response = await detectNeck(frameDataUrl);

        if (!cancelled) {
          setNeckDetections(response?.data || null);
        }
      } catch (error) {
        // Keep the last good shoulder estimate and let the overlay fall back if needed.
      } finally {
        neckRequestInFlightRef.current = false;
        if (!cancelled) {
          timeoutId = window.setTimeout(detectNeckLoop, 450);
        }
      }
    };

    detectNeckLoop();

    return () => {
      cancelled = true;
      neckRequestInFlightRef.current = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [hasNecklaceSelected, faceDetected, hasPrimaryHolisticNeck, setNeckDetections]);

  const handleSnapshot = useCallback(async () => {
    const overlayCanvas = canvasRef.current;
    const video = cameraControlRef.current?.videoElement;
    if (!overlayCanvas) return;

    const snapshotCanvas = snapshotCanvasRef.current || document.createElement('canvas');
    snapshotCanvasRef.current = snapshotCanvas;

    const width = overlayCanvas.width || video?.videoWidth || overlayCanvas.clientWidth || 640;
    const height = overlayCanvas.height || video?.videoHeight || overlayCanvas.clientHeight || 480;
    snapshotCanvas.width = width;
    snapshotCanvas.height = height;

    const snapshotCtx = snapshotCanvas.getContext('2d');
    if (!snapshotCtx) return;

    snapshotCtx.clearRect(0, 0, width, height);
    snapshotCtx.save();
    snapshotCtx.translate(width, 0);
    snapshotCtx.scale(-1, 1);
    if (video && video.readyState >= 2) {
      snapshotCtx.drawImage(video, 0, 0, width, height);
    }
    snapshotCtx.drawImage(overlayCanvas, 0, 0, width, height);
    snapshotCtx.restore();

    const dataUrl = snapshotCanvas.toDataURL('image/png');
    const selectedIds = Object.values(selectedJewelry).map(j => j.id);

    if (selectedIds.length > 0) {
      try {
        await saveTryOnSnapshot({
          jewelry_item: selectedIds[0],
          snapshot_image: dataUrl,
          session_duration: 0,
        });
        setSnapshotMsg('✅ Snapshot saved!');
      } catch {
        setSnapshotMsg('📸 Snapshot captured locally');
      }
    } else {
      setSnapshotMsg('📸 Captured!');
    }

    // Download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `jewel-tryon-${Date.now()}.png`;
    a.click();

    setTimeout(() => setSnapshotMsg(''), 3000);
  }, [selectedJewelry]);

  const handleCameraOn = useCallback(() => {
    if (cameraControlRef.current?.startCamera) {
      lastLandmarkUpdateRef.current = Date.now();
      cameraControlRef.current.startCamera();
      setCameraOn(true);
    }
  }, []);

  const handleCameraOff = useCallback(() => {
    if (cameraControlRef.current?.stopCamera) {
      cameraControlRef.current.stopCamera({ force: false });
      setCameraOn(false);
    }
  }, []);

  const handleLandmarks = useCallback((lm) => {
    lastLandmarkUpdateRef.current = Date.now();
    setLandmarks(lm.landmarks || []);
    setFaceMetrics(lm.face_metrics || {});
    setFaceDetected(lm.face_detected || false);
    setPoseNeck(lm.pose_neck || null);
    setHandLandmarks(lm.hand_landmarks || null);
  }, [setLandmarks, setFaceMetrics, setFaceDetected, setPoseNeck, setHandLandmarks]);

  // ═════════════════════════════════════════════════════════════════
  // Fix #4: Detector Health Monitoring
  // ═════════════════════════════════════════════════════════════════
  const [detectorHealth, setDetectorHealth] = useState('healthy');
  const detectorCheckIntervalRef = useRef(null);

  useEffect(() => {
    // Monitor if landmarks are updating
    detectorCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastLandmarkUpdateRef.current;

      if (!cameraOn) {
        setDetectorHealth('offline');
      } else if (timeSinceLastUpdate > 2500) {
        setDetectorHealth('stalled');
      } else if (faceDetected) {
        setDetectorHealth('healthy');
      } else {
        setDetectorHealth('no-face');
      }
    }, 1000);

    return () => {
      if (detectorCheckIntervalRef.current) {
        clearInterval(detectorCheckIntervalRef.current);
      }
    };
  }, [cameraOn, faceDetected]);

  // Recovery function for detector
  const recoverDetector = useCallback(() => {
    console.log('[TryOnStudio] Recovering detector...');
    setCameraOn(false);
    lastLandmarkUpdateRef.current = 0;
    if (cameraControlRef.current?.stopCamera) {
      cameraControlRef.current.stopCamera({ force: true });
    }
    setTimeout(() => {
      if (cameraControlRef.current?.startCamera) {
        cameraControlRef.current.startCamera();
        setCameraOn(true);
      }
    }, 500);
  }, []);

  const selectedCount = Object.keys(selectedJewelry).length;
  const trackingStalled = detectorHealth === 'stalled';

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-b from-surface-950 via-surface-900 to-surface-950">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
        {/* Left Panel — Jewelry Selector */}
        <div className="w-full lg:w-96 bg-gradient-to-b from-white/5 via-white/3 to-transparent border-r border-white/10 backdrop-blur-xl overflow-y-auto p-6 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent mb-1">Jewelry Catalog</h2>
            <p className="text-sm text-white/40">Select items and see them on your face</p>
          </div>

          {/* Category Tabs */}
          <div className="flex lg:flex-wrap gap-2 mb-6 overflow-x-auto pb-3">
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap font-medium transition-all duration-300 ${
                  activeCategory === cat.slug
                    ? 'bg-gradient-to-r from-primary-500 to-pink-500 text-white shadow-lg shadow-primary-500/30 scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 border border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-lg">{CATEGORY_ICONS[cat.slug] || '💎'}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* Jewelry Grid */}
          <div className="grid grid-cols-2 gap-4">
            {filteredJewelry.map((item, idx) => {
              const isSelected = Object.values(selectedJewelry).some(j => j.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => selectJewelry(item.category_slug, item)}
                  className={`rounded-2xl overflow-hidden transition-all duration-300 border group ${
                    isSelected
                      ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-surface-900 bg-gradient-to-br from-primary-500/20 to-pink-500/20 border-primary-500/50 shadow-lg shadow-primary-500/20'
                      : 'bg-white/8 hover:bg-white/15 border-white/20 hover:border-white/40 hover:shadow-lg hover:shadow-white/10'
                  }`}
                  style={{
                    animation: isSelected ? 'pulse 2s infinite' : 'none',
                  }}
                >
                  <div className="relative">
                    {item.image_2d ? (
                      <img src={item.image_2d} alt={item.name}
                        className="w-full h-28 object-contain p-3 bg-gradient-to-br from-white/5 to-white/[2%] group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-28 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">💎</div>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-gradient-to-t from-black/40 to-transparent">
                    <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                    {item.price && <p className="text-[11px] text-primary-300 font-medium mt-1">₹ {item.price}</p>}
                  </div>
                </button>
              );
            })}
            {filteredJewelry.length === 0 && !loading && (
              <div className="col-span-2 text-center py-12 text-white/30 text-sm">
                No items in this category
              </div>
            )}
          </div>
        </div>

        {/* Center — Camera + Overlay */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group">
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-pink-500/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <WebcamCapture
            ref={cameraControlRef}
            canvasRef={canvasRef}
            onLandmarks={handleLandmarks}
          />

          <JewelryOverlay
            canvasRef={canvasRef}
            cameraControlRef={cameraControlRef}
            landmarks={landmarks}
            selectedJewelry={selectedJewelry}
            earDetections={earDetections}
            neckDetections={neckDetections}
            poseNeck={poseNeck}
            handLandmarks={handLandmarks}
          />

          {/* Face detection indicator */}
          <div className={`absolute top-6 left-6 flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold backdrop-blur-xl border transition-all duration-300 ${
            trackingStalled
              ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
              : !faceDetected
              ? 'bg-red-500/20 text-red-200 border-red-500/40'
              : neckTracked
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                : hasNecklaceSelected
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              trackingStalled
                ? 'bg-amber-400'
                : !faceDetected
                ? 'bg-red-400'
                : neckTracked
                  ? 'bg-emerald-400'
                  : hasNecklaceSelected
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
            } animate-pulse`} />
            {trackingStalled
              ? '📹 Tracking Stalled'
              : !faceDetected
              ? '👤 No Face Detected'
              : neckTracked
                ? '✓ Face + Neck Tracked'
                : hasNecklaceSelected
                  ? '🔍 Searching Neck'
                  : '✓ Face Detected'}
          </div>

          {/* Selected jewelry indicator */}
          {selectedCount > 0 && (
            <div className="absolute top-6 right-6 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary-500/30 to-pink-500/30 text-primary-200 text-sm font-semibold backdrop-blur-xl border border-primary-500/50 shadow-lg shadow-primary-500/20 flex items-center gap-2">
              <span className="text-lg">✨</span>
              {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
            </div>
          )}

          {/* Detector Health Indicator with Recovery */}
          <div className={`absolute right-6 flex items-center gap-2 ${selectedCount > 0 ? 'top-20' : 'top-6'}`}>
              {detectorHealth === 'healthy' && (
                <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-200 text-sm font-semibold flex items-center gap-2 backdrop-blur-xl border border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ✓ Tracking Perfect
                </div>
              )}
              {detectorHealth === 'no-face' && (
                <div className="px-4 py-2.5 rounded-2xl bg-amber-500/20 text-amber-200 text-sm font-semibold flex items-center gap-2 backdrop-blur-xl border border-amber-500/40 shadow-lg shadow-amber-500/20">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  ⚠ No Face
                </div>
              )}
              {detectorHealth === 'stalled' && (
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2.5 rounded-2xl bg-amber-500/20 text-amber-200 text-sm font-semibold flex items-center gap-2 backdrop-blur-xl border border-amber-500/40 shadow-lg shadow-amber-500/20">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Tracking Stalled
                  </div>
                  <button
                    onClick={recoverDetector}
                    className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary-500 to-pink-500 text-white hover:shadow-lg hover:shadow-primary-500/30 text-sm font-semibold transition-all duration-300 hover:scale-105"
                    title="Restart detector"
                  >
                    🔄 Recover
                  </button>
                </div>
              )}
              {detectorHealth === 'offline' && (
                <div className="px-4 py-2.5 rounded-2xl bg-red-500/20 text-red-200 text-sm font-semibold flex items-center gap-2 backdrop-blur-xl border border-red-500/40">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  ✗ Camera Off
                </div>
              )}
          </div>

          {/* Snapshot message */}
          {snapshotMsg && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-pink-500 text-white font-semibold animate-bounce shadow-lg shadow-primary-500/30 backdrop-blur-xl border border-white/20">
              {snapshotMsg}
            </div>
          )}

          {handTrackingWarning && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-3xl bg-black/70 backdrop-blur-xl border border-amber-400/50 text-center pointer-events-none shadow-2xl">
              <p className="text-base font-bold text-amber-200">👐 Hand Not Detected</p>
              <p className="text-sm text-white/80 mt-2">Show your hand clearly to place the {handTrackingLabel}.</p>
            </div>
          )}
        </div>

        {/* Right Panel — Actions */}
        <div className="w-full lg:w-96 bg-gradient-to-b from-white/5 via-white/3 to-transparent border-l border-white/10 backdrop-blur-xl p-6 flex flex-col gap-6 shadow-2xl">
          <div>
            <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent mb-1">Controls</h2>
            <p className="text-sm text-white/40">Manage your try-on experience</p>
          </div>

          {/* Camera Control */}
          <div className="flex gap-3">
            <button
              onClick={handleCameraOn}
              disabled={cameraOn}
              className={`flex-1 px-4 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 border ${
                cameraOn
                  ? 'bg-emerald-500/10 text-emerald-300 cursor-not-allowed opacity-40 border-emerald-500/20'
                  : 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-200 hover:from-emerald-500/30 hover:to-emerald-500/20 border-emerald-500/40 hover:border-emerald-500/60 shadow-lg shadow-emerald-500/10'
              }`}
            >
              <span className="text-xl">📷</span> Camera ON
            </button>
            <button
              onClick={handleCameraOff}
              disabled={!cameraOn}
              className={`flex-1 px-4 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 border ${
                !cameraOn
                  ? 'bg-red-500/10 text-red-300 cursor-not-allowed opacity-40 border-red-500/20'
                  : 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-200 hover:from-red-500/30 hover:to-red-500/20 border-red-500/40 hover:border-red-500/60 shadow-lg shadow-red-500/10'
              }`}
            >
              <span className="text-xl">🚫</span> Camera OFF
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleSnapshot}
              className="w-full px-6 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-primary-500 to-pink-500 text-white flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/30 hover:scale-105 active:scale-95 border border-primary-400/50"
            >
              <HiCamera className="w-6 h-6" /> Capture Snapshot
            </button>

            <button
              onClick={() => clearJewelry()}
              className="w-full px-6 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 flex items-center justify-center gap-3 transition-all duration-300 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10"
            >
              <HiRefresh className="w-6 h-6" /> Clear All
            </button>

            <button
              onClick={() => setDebugMode(!debugMode)}
              className="w-full px-6 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/40 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10"
            >
              {debugMode ? <HiEyeOff className="w-6 h-6" /> : <HiEye className="w-6 h-6" />}
              {debugMode ? 'Hide Landmarks' : 'Show Landmarks'}
            </button>
          </div>

          {/* Selected Items */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="bg-gradient-to-r from-primary-500/10 to-pink-500/10 rounded-2xl p-4 border border-primary-500/20">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                <span className="text-lg">✨</span>
                Selected Items ({selectedCount})
              </h3>
              {selectedCount === 0 ? (
                <p className="text-xs text-white/40 text-center py-6">Select jewelry from the catalog to see them here</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(selectedJewelry).map(([cat, item]) => (
                    <div key={cat} className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all border border-white/10">
                      {item.image_2d ? (
                        <img src={item.image_2d} alt={item.name} className="w-12 h-12 rounded-lg object-contain bg-gradient-to-br from-white/10 to-white/5 p-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-lg">💎</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-white/50 capitalize font-medium">{cat}</p>
                      </div>
                      <button
                        onClick={() => clearJewelry(cat)}
                        className="text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-lg p-1.5 transition-all text-lg"
                      >
                        <HiX className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
