import React, { useEffect, useRef, useCallback } from 'react';
import { PointStabilizer, SizeStabilizer, KalmanFilter1D, RotationStabilizer } from '../../utils/kalmanFilter';
import { useAR } from '../../context/ARContext';

function createExponentialPointSmoother(alpha = 0.7) {
  let prev = null;

  return {
    smooth(x, y) {
      if (!prev) {
        prev = { x, y };
        return prev;
      }

      prev = {
        x: prev.x * alpha + x * (1 - alpha),
        y: prev.y * alpha + y * (1 - alpha),
      };
      return prev;
    },
    reset() {
      prev = null;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Kalman stabilizers — tuned per jewelry type for optimal tracking
// v3: Using adaptive Kalman filters for responsive yet stable tracking
// ═══════════════════════════════════════════════════════════════════════
const stabilizers = {
  // Earrings: Balance smoothness with responsiveness
  leftEar: {
    pos: new PointStabilizer(0.012, 0.07),
    size: new SizeStabilizer(0.006, 0.10),
    rot: new RotationStabilizer()
  },
  rightEar: {
    pos: new PointStabilizer(0.012, 0.07),
    size: new SizeStabilizer(0.006, 0.10),
    rot: new RotationStabilizer()
  },

  // Necklace: Needs to follow body movement quickly
  necklace: {
    pos: new PointStabilizer(0.010, 0.08),
    size: new SizeStabilizer(0.006, 0.12),
    zScale: new KalmanFilter1D(0.008, 0.08),
    rot: new RotationStabilizer(0.006, 0.15)
  },

  // Nose pin: Quick response for small movements
  nosePin: {
    pos: new PointStabilizer(0.015, 0.07),
    size: new SizeStabilizer(0.008, 0.10),
    rot: new RotationStabilizer()
  },

  // Nethi Chudi: Medium responsiveness for forehead jewelry
  nethiChudi: {
    pos: new PointStabilizer(0.010, 0.08),
    ema: createExponentialPointSmoother(0.7),
    size: new SizeStabilizer(0.006, 0.10),
    rot: new RotationStabilizer()
  },

  // Ring: Fast hand movements need very responsive tracking
  ring: {
    pos: new PointStabilizer(0.020, 0.06),
    size: new SizeStabilizer(0.012, 0.08),
    rot: new RotationStabilizer(0.008, 0.10)
  },

  // Bangle: Fast hand movements
  bangle: {
    pos: new PointStabilizer(0.018, 0.06),
    size: new SizeStabilizer(0.012, 0.08),
    rot: new RotationStabilizer(0.008, 0.10)
  },
};

// ═══════════════════════════════════════════════════════════════════════
// Fixed render order — deterministic layering to prevent z-fighting
// Body jewelry draws first (behind), face jewelry on top
// ═══════════════════════════════════════════════════════════════════════
const RENDER_ORDER = ['necklace', 'bangle', 'ring', 'earring', 'nethichudi', 'nethi', 'chudi', 'forehead', 'nose', 'mukuthi', 'nosepin'];

function getRenderPriority(catSlug) {
  for (let i = 0; i < RENDER_ORDER.length; i++) {
    if (catSlug.includes(RENDER_ORDER[i])) return i;
  }
  return RENDER_ORDER.length; // unknown → draw last
}

const imageCache = {};
const imagePromiseCache = {};
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerp = (start, end, t) => start + (end - start) * t;
const dist = (a, b) => Math.hypot((a.px ?? a.x) - (b.px ?? b.x), (a.py ?? a.y) - (b.py ?? b.y));

// ═══════════════════════════════════════════════════════════════════════
// Background removal & necklace profile analysis
// ═══════════════════════════════════════════════════════════════════════

function averageCornerColor(data, width, height) {
  const corners = [0, (width - 1) * 4, ((height - 1) * width) * 4, ((height * width) - 1) * 4];
  const total = [0, 0, 0];
  corners.forEach((i) => { total[0] += data[i]; total[1] += data[i + 1]; total[2] += data[i + 2]; });
  return total.map(c => c / corners.length);
}

function analyzeJewelryCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      maxRowRatio: 1,
      topQuarterMassRatio: 0.25,
      centerMassXRatio: 0.5,
      centerMassYRatio: 0.5,
      topAnchorXRatio: 0.5,
      topAnchorYRatio: 0.08,
    };
  }
  const { width, height } = canvas;
  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return {
      maxRowRatio: 1,
      topQuarterMassRatio: 0.25,
      centerMassXRatio: 0.5,
      centerMassYRatio: 0.5,
      topAnchorXRatio: 0.5,
      topAnchorYRatio: 0.08,
    };
  }
  const { data } = imageData;
  const rowCounts = new Array(height).fill(0);
  let totalOpaque = 0, maxRow = 0, alphaMass = 0, weightedX = 0, weightedY = 0;
  for (let y = 0; y < height; y++) {
    let c = 0;
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= 10) continue;
      c++;
      alphaMass += alpha;
      weightedX += x * alpha;
      weightedY += y * alpha;
    }
    rowCounts[y] = c; totalOpaque += c; maxRow = Math.max(maxRow, c);
  }
  const topQ = Math.max(1, Math.round(height * 0.25));
  const topQOpaque = rowCounts.slice(0, topQ).reduce((s, c) => s + c, 0);
  const topBand = Math.max(1, Math.round(height * 0.18));
  let topAnchorMass = 0, topWeightedX = 0, topWeightedY = 0;
  for (let y = 0; y < topBand; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= 10) continue;
      topAnchorMass += alpha;
      topWeightedX += x * alpha;
      topWeightedY += y * alpha;
    }
  }

  return {
    maxRowRatio: width > 0 ? maxRow / width : 1,
    topQuarterMassRatio: totalOpaque > 0 ? topQOpaque / totalOpaque : 0.25,
    centerMassXRatio: alphaMass > 0 ? (weightedX / alphaMass) / width : 0.5,
    centerMassYRatio: alphaMass > 0 ? (weightedY / alphaMass) / height : 0.5,
    topAnchorXRatio: topAnchorMass > 0 ? (topWeightedX / topAnchorMass) / width : 0.5,
    topAnchorYRatio: topAnchorMass > 0 ? (topWeightedY / topAnchorMass) / height : 0.08,
  };
}

function getNecklaceRenderProfile(img) {
  const meta = img?._jewelryMeta || {};
  const maxRowRatio = meta.maxRowRatio ?? 1;
  const topQuarterMassRatio = meta.topQuarterMassRatio ?? 0.25;
  const centerMassYRatio = meta.centerMassYRatio ?? 0.5;
  const topAnchorYRatio = clamp(meta.topAnchorYRatio ?? 0.10, 0.07, 0.18);
  const imageAspectRatio = (img?.height || 1) / Math.max(img?.width || 1, 1);

  // Pendant-style necklace assets are tall and visually heavy at the bottom.
  // They need a slightly wider render size and a lower draw origin so the chain
  // sits on the collarbone instead of floating toward the chin.
  if (maxRowRatio < 0.42 && topQuarterMassRatio < 0.20 && centerMassYRatio > 0.54) {
    return {
      style: 'pendant',
      widthScale: 0.82,
      heightScale: 0.88,
      anchorOffsetY: 0.01,
      anchorYRatio: clamp(topAnchorYRatio - 0.01, 0.07, 0.15),
      minWidthScale: 0.78,
      maxWidthScale: 0.98,
      baseWidthScale: 0.88,
      shoulderCoverage: 0.64,
      placementDropScale: 0.92,
      verticalBias: 0.004,
      maxBottomOffsetScale: 0.72,
      centerMassBlend: 0.18,
    };
  }

  // Layered or deep-drop necklaces need a tighter shoulder span and a lower
  // collar anchor, otherwise they ride up toward the throat.
  if (imageAspectRatio > 1.02 && maxRowRatio > 0.46 && topQuarterMassRatio < 0.30 && centerMassYRatio > 0.50) {
    return {
      style: 'layered',
      widthScale: 0.80,
      heightScale: 0.86,
      anchorOffsetY: 0.016,
      anchorYRatio: clamp(topAnchorYRatio - 0.015, 0.06, 0.13),
      minWidthScale: 0.80,
      maxWidthScale: 1.00,
      baseWidthScale: 0.89,
      shoulderCoverage: 0.64,
      placementDropScale: 0.98,
      verticalBias: 0.010,
      maxBottomOffsetScale: 0.82,
      centerMassBlend: 0.02,
    };
  }

  if (maxRowRatio < 0.35) {
    return {
      style: 'slim',
      widthScale: 0.92,
      heightScale: 0.88,
      anchorOffsetY: 0.02,
      anchorYRatio: clamp(topAnchorYRatio - 0.01, 0.06, 0.15),
      minWidthScale: 0.84,
      maxWidthScale: 1.18,
      baseWidthScale: 0.96,
      shoulderCoverage: 0.72,
      placementDropScale: 1.10,
      verticalBias: 0.010,
      maxBottomOffsetScale: 0.76,
      centerMassBlend: 0.08,
    };
  }

  if (maxRowRatio > 0.5 && topQuarterMassRatio < 0.18) {
    return {
      style: 'broad',
      widthScale: 0.82,
      heightScale: 0.82,
      anchorOffsetY: 0.00,
      anchorYRatio: clamp(topAnchorYRatio, 0.08, 0.18),
      minWidthScale: 0.80,
      maxWidthScale: 1.08,
      baseWidthScale: 1.00,
      shoulderCoverage: 0.78,
      placementDropScale: 0.96,
      verticalBias: 0.002,
      maxBottomOffsetScale: 0.80,
      centerMassBlend: 0.05,
    };
  }

  return {
    style: 'classic',
    widthScale: 0.92,
    heightScale: 0.94,
    anchorOffsetY: 0.015,
    anchorYRatio: clamp(topAnchorYRatio - 0.01, 0.06, 0.16),
    minWidthScale: 0.84,
    maxWidthScale: 1.04,
    baseWidthScale: 0.92,
    shoulderCoverage: 0.70,
    placementDropScale: 0.94,
    verticalBias: 0.006,
    maxBottomOffsetScale: 0.78,
    centerMassBlend: 0.10,
  };
}

function drawAnchoredImage(ctx, img, width, height, anchorXRatio = 0.5, anchorYRatio = 0.5) {
  ctx.drawImage(
    img,
    -width * clamp(anchorXRatio, 0, 1),
    -height * clamp(anchorYRatio, 0, 1),
    width,
    height
  );
}

function normalizeJewelryImage(img) {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = img.naturalWidth || img.width;
  sourceCanvas.height = img.naturalHeight || img.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return img;
  ctx.drawImage(img, 0, 0);
  let imageData;
  try { imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height); } catch { return img; }
  const { data, width, height } = imageData;
  const background = averageCornerColor(data, width, height);
  const visited = new Uint8Array(width * height);
  const queue = [];
  const threshold = 22;
  const matchesBg = (off) => {
    if (data[off + 3] === 0) return true;
    const b = (data[off] + data[off + 1] + data[off + 2]) / 3;
    return b > 220 && Math.abs(data[off] - background[0]) <= threshold && Math.abs(data[off + 1] - background[1]) <= threshold && Math.abs(data[off + 2] - background[2]) <= threshold;
  };
  const enq = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (matchesBg(idx * 4)) queue.push(idx);
  };
  for (let x = 0; x < width; x++) { enq(x, 0); enq(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { enq(0, y); enq(width - 1, y); }
  while (queue.length > 0) {
    const idx = queue.pop(); data[idx * 4 + 3] = 0;
    const x = idx % width, y = Math.floor(idx / width);
    enq(x - 1, y); enq(x + 1, y); enq(x, y - 1); enq(x, y + 1);
  }
  ctx.putImageData(imageData, 0, 0);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] <= 10) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) { sourceCanvas._jewelryMeta = analyzeJewelryCanvas(sourceCanvas); return sourceCanvas; }
  const cc = document.createElement('canvas');
  cc.width = maxX - minX + 1; cc.height = maxY - minY + 1;
  const cctx = cc.getContext('2d');
  if (!cctx) return sourceCanvas;
  cctx.drawImage(sourceCanvas, minX, minY, cc.width, cc.height, 0, 0, cc.width, cc.height);
  cc._jewelryMeta = analyzeJewelryCanvas(cc);
  return cc;
}

function loadImage(src) {
  if (imageCache[src]) return Promise.resolve(imageCache[src]);
  if (imagePromiseCache[src]) return imagePromiseCache[src];

  imagePromiseCache[src] = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { const n = normalizeJewelryImage(img); imageCache[src] = n; resolve(n); };
    img.onerror = () => resolve(null);
    img.src = src;
  }).finally(() => {
    delete imagePromiseCache[src];
  });

  return imagePromiseCache[src];
}

function getLoadedImage(src) {
  if (imageCache[src]) {
    return imageCache[src];
  }

  if (src) {
    void loadImage(src);
  }

  return null;
}

function resetAllStabilizers() {
  Object.values(stabilizers).forEach(({ pos, ema, size, zScale, rot }) => {
    pos?.reset(); ema?.reset(); size?.reset(); zScale?.reset(); rot?.reset();
  });
}

function syncCanvasToVideo(canvas, video, frameWidth, frameHeight) {
  const dw = video.clientWidth || frameWidth;
  const dh = video.clientHeight || frameHeight;
  const parent = video.parentElement;
  const pw = parent?.clientWidth || dw;
  const ph = parent?.clientHeight || dh;
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  canvas.style.width = `${dw}px`;
  canvas.style.height = `${dh}px`;
  canvas.style.left = `${Math.max((pw - dw) / 2, 0)}px`;
  canvas.style.top = `${Math.max((ph - dh) / 2, 0)}px`;
}

// ═══════════════════════════════════════════════════════════════════════
// Face geometry helpers
// ═══════════════════════════════════════════════════════════════════════

function estimateYaw(landmarks, faceWidth) {
  const nose = landmarks[1], leftFace = landmarks[234], rightFace = landmarks[454];
  if (!nose || !leftFace || !rightFace) return 0;
  const hBias = (nose.px - (leftFace.px + rightFace.px) / 2) / Math.max(faceWidth * 0.18, 1);
  const dBias = ((leftFace.z ?? 0) - (rightFace.z ?? 0)) * 2.5;
  return clamp((hBias + dBias) / 2, -1, 1);
}

function estimatePitch(landmarks, faceHeight) {
  const forehead = landmarks[10], nose = landmarks[1], chin = landmarks[152];
  if (!forehead || !nose || !chin) return 0;
  return clamp((nose.py - (forehead.py + chin.py) / 2) / Math.max(faceHeight * 0.35, 1), -1, 1);
}

function getFacePose(landmarks, faceWidth, faceHeight, faceMetrics = {}) {
  const fallbackYaw = estimateYaw(landmarks, faceWidth);
  const fallbackPitch = estimatePitch(landmarks, faceHeight);
  const yaw = clamp(typeof faceMetrics?.yaw === 'number' ? faceMetrics.yaw : fallbackYaw, -1, 1);
  const pitch = clamp(typeof faceMetrics?.pitch === 'number' ? faceMetrics.pitch : fallbackPitch, -1, 1);
  const yawDegrees = typeof faceMetrics?.yaw_degrees === 'number' ? faceMetrics.yaw_degrees : yaw * 28;
  const pitchDegrees = typeof faceMetrics?.pitch_degrees === 'number' ? faceMetrics.pitch_degrees : pitch * 20;
  const earDepthGap = typeof faceMetrics?.ear_depth_gap === 'number'
    ? faceMetrics.ear_depth_gap
    : Math.abs((landmarks[234]?.z ?? 0) - (landmarks[454]?.z ?? 0));

  return {
    yaw,
    pitch,
    yawDegrees,
    pitchDegrees,
    earDepthGap,
    frontFacing: typeof faceMetrics?.front_facing === 'boolean'
      ? faceMetrics.front_facing
      : Math.abs(yawDegrees) < 10 && earDepthGap < 0.045,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Necklace placement calculator
// ═══════════════════════════════════════════════════════════════════════

// Shared helper for centered forehead-jewelry placement.
function estimateNethiHeadPose(landmarks, fallbackRoll = 0) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const upperForehead = landmarks[10];
  const noseBridge = landmarks[168] || landmarks[6] || landmarks[1];

  if (!leftEye || !rightEye || !upperForehead || !noseBridge) {
    return {
      correctedRoll: fallbackRoll,
      eyeMidX: upperForehead?.px ?? 0,
      eyeDistance: 0,
      isStraight: false,
      verticalAnchorY: upperForehead?.py ?? 0,
      upperForehead,
      noseBridge,
    };
  }

  const eyeMidX = (leftEye.px + rightEye.px) / 2;
  const eyeDistance = dist(leftEye, rightEye);
  const straightThreshold = Math.max(eyeDistance * 0.04, 4);
  const isStraight = Math.abs(leftEye.py - rightEye.py) < straightThreshold;

  const eyeRoll = Math.atan2(rightEye.py - leftEye.py, rightEye.px - leftEye.px) * (180 / Math.PI);
  const midlineAngle = Math.atan2(
    noseBridge.py - upperForehead.py,
    noseBridge.px - upperForehead.px
  ) * (180 / Math.PI);
  const midlineRoll = midlineAngle - 90;

  const correctedRoll = clamp(
    isStraight
      ? eyeRoll * 0.75 + midlineRoll * 0.25
      : eyeRoll * 0.60 + midlineRoll * 0.40,
    -25,
    25
  );

  return {
    correctedRoll,
    eyeMidX,
    eyeDistance,
    isStraight,
    verticalAnchorY: lerp(upperForehead.py, noseBridge.py, 0.5),
    upperForehead,
    noseBridge,
  };
}

function getTrackedHandScore(hand, imgW, imgH) {
  if (!Array.isArray(hand) || hand.length < 21) return 0;

  const wrist = hand[0];
  const indexMCP = hand[5];
  const middleMCP = hand[9];
  const ringMCP = hand[13];
  const ringPIP = hand[14];
  const pinkyMCP = hand[17];

  if (!wrist || !indexMCP || !middleMCP || !ringMCP || !ringPIP || !pinkyMCP) return 0;

  const palmWidth = Math.hypot(
    (indexMCP.x - pinkyMCP.x) * imgW,
    (indexMCP.y - pinkyMCP.y) * imgH
  );
  const ringSegment = Math.hypot(
    (ringPIP.x - ringMCP.x) * imgW,
    (ringPIP.y - ringMCP.y) * imgH
  );

  return palmWidth + ringSegment * 0.75;
}

function getPrimaryTrackedHand(handLandmarks, imgW, imgH) {
  if (!Array.isArray(handLandmarks) || handLandmarks.length === 0) return null;

  return handLandmarks
    .filter(hand => Array.isArray(hand) && hand.length >= 21)
    .sort((left, right) => getTrackedHandScore(right, imgW, imgH) - getTrackedHandScore(left, imgW, imgH))[0] || null;
}

function normalizeUprightAngle(angle) {
  let normalized = angle;

  while (normalized > Math.PI / 2) normalized -= Math.PI;
  while (normalized < -Math.PI / 2) normalized += Math.PI;

  return normalized;
}

function getNecklacePlacement(landmarks, faceWidth, faceHeight, neckDetections, poseNeck, frameWidth, frameHeight, imageAspectRatio, renderProfile = {}) {
  const chin = landmarks[152], nose = landmarks[1], leftFace = landmarks[234], rightFace = landmarks[454];
  if (!chin || !nose || !leftFace || !rightFace) return null;

  const yaw = estimateYaw(landmarks, faceWidth);
  const pitch = estimatePitch(landmarks, faceHeight);
  const jawWidth = dist(leftFace, rightFace);
  const fallbackCollarboneY = chin.py + faceHeight * 0.42;
  const fallbackAnchorX = nose.px + yaw * faceWidth * 0.015;
  const baseWidthScale = renderProfile.baseWidthScale ?? 1;
  const shoulderCoverage = renderProfile.shoulderCoverage ?? 0.84;
  const placementDropScale = renderProfile.placementDropScale ?? 1;
  const verticalBias = renderProfile.verticalBias ?? 0;
  const fallbackWidth = clamp(
    Math.max(jawWidth * 0.92, faceWidth * 0.90),
    faceWidth * 0.84,
    faceWidth * 1.08
  );

  const hasPoseNeck = Boolean(poseNeck && poseNeck.confidence > 0.25 && typeof poseNeck.neck_center_x === 'number');
  const hasDetectedNeck = Boolean(neckDetections && neckDetections.confidence > 0.35 && typeof neckDetections.neck_center_x === 'number' && (neckDetections.neck_width || 0) > 0);
  const hasNeckTracking = hasPoseNeck || hasDetectedNeck;

  let anchorX = fallbackAnchorX;
  let anchorY = chin.py + faceHeight * 0.22;
  let baseWidth = fallbackWidth;
  let collarboneY = fallbackCollarboneY;
  let confidence = 0.58;
  let source = 'facemesh_fallback';
  let rawZDepth = 0;
  let shoulderSpan = jawWidth * 1.12;
  let verticalDrop = faceHeight * 0.018;
  let blendWeight = 0;

  if (hasPoseNeck) {
    const poseCX = poseNeck.neck_center_x * frameWidth;
    const swPx = (poseNeck.shoulder_width || 0.3) * frameWidth;
    const nwPx = Math.max((poseNeck.neck_width || (poseNeck.shoulder_width * 0.5) || 0.15) * frameWidth, faceWidth * 0.72);
    const collarFromPose = (poseNeck.collarbone_y ?? poseNeck.neck_center_y) * frameHeight || fallbackCollarboneY;
    const poseBaseW = clamp(
      Math.max(swPx * 0.52, nwPx * 1.10, jawWidth * 0.98),
      faceWidth * 0.88,
      Math.max(faceWidth * 1.24, swPx * 0.84)
    );
    const poseWeight = clamp((poseNeck.confidence - 0.25) / 0.55, 0.45, 0.90);
    anchorX = lerp(fallbackAnchorX, poseCX + yaw * faceWidth * 0.018, poseWeight);
    collarboneY = lerp(fallbackCollarboneY, collarFromPose, poseWeight);
    baseWidth = lerp(fallbackWidth, poseBaseW, poseWeight) * baseWidthScale;
    confidence = poseNeck.confidence;
    source = poseNeck.source || 'pose';
    rawZDepth = poseNeck.z_depth ?? 0;
    shoulderSpan = Math.max(swPx, jawWidth * 1.18);
    verticalDrop = lerp(faceHeight * 0.018, Math.max(faceHeight * 0.028, swPx * 0.016), poseWeight);
    blendWeight = poseWeight;
  } else if (hasDetectedNeck) {
    const dsw = (neckDetections.shoulder_width || 0) * frameWidth;
    const dnw = (neckDetections.neck_width || 0) * frameWidth;
    const dncx = neckDetections.neck_center_x * frameWidth;
    const detectedCollarboneY = (neckDetections.collarbone_y || 0) * frameHeight || fallbackCollarboneY;
    const detectedBaseW = dsw > 0
      ? clamp(Math.max(dsw * 0.50, dnw * 1.08, jawWidth * 0.96), faceWidth * 0.86, Math.max(faceWidth * 1.20, dsw * 0.82))
      : clamp(Math.max(dnw * 1.12, jawWidth * 0.98), faceWidth * 0.86, faceWidth * 1.14);
    const detectedWeight = clamp((neckDetections.confidence - 0.35) / 0.45, 0.38, 0.78);
    anchorX = lerp(fallbackAnchorX, dncx + yaw * faceWidth * 0.020, detectedWeight);
    collarboneY = lerp(fallbackCollarboneY, detectedCollarboneY, detectedWeight);
    baseWidth = lerp(fallbackWidth, detectedBaseW, detectedWeight) * baseWidthScale;
    confidence = neckDetections.confidence;
    source = neckDetections.source || 'pose+facemesh';
    shoulderSpan = dsw || Math.max(dnw * 1.25, jawWidth * 1.08);
    verticalDrop = dsw > 0
      ? lerp(faceHeight * 0.018, Math.max(faceHeight * 0.026, dsw * 0.014), detectedWeight)
      : faceHeight * 0.024;
    blendWeight = detectedWeight;
  } else {
    baseWidth *= baseWidthScale;
  }

  const minCollarboneY = chin.py + faceHeight * 0.22;
  if (hasNeckTracking) {
    collarboneY = Math.max(collarboneY, minCollarboneY);
  } else {
    const maxCollarboneY = chin.py + faceHeight * 0.50;
    collarboneY = clamp(collarboneY, minCollarboneY, Math.max(minCollarboneY + 1, maxCollarboneY));
  }

  anchorY = (
    collarboneY
    + faceHeight * (lerp(0.020, 0.035, blendWeight) + verticalBias)
    + verticalDrop * placementDropScale
    + pitch * faceHeight * 0.006
  );
  const depthScaleFactor = 1 + rawZDepth * 0.14;
  const width = clamp(
    baseWidth * (1 - Math.abs(yaw) * 0.06) * depthScaleFactor,
    faceWidth * 0.86,
    Math.max(faceWidth * 1.18, shoulderSpan * shoulderCoverage)
  );
  const height = width * imageAspectRatio;
  const minAY = chin.py + faceHeight * 0.16;
  const maxAY = hasNeckTracking ? collarboneY + faceHeight * (0.16 + Math.max(verticalBias, 0)) : chin.py + faceHeight * 0.34;
  anchorX = clamp(anchorX, width / 2, frameWidth - width / 2);
  anchorY = clamp(anchorY, minAY, Math.max(minAY + 1, maxAY));

  return { x: anchorX, y: anchorY, width, height, collarboneY, confidence, source, zDepthScale: depthScaleFactor };
}

function drawNeckDebug(ctx, placement) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 196, 0, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(placement.x, placement.y, 6, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(placement.x - placement.width * 0.32, placement.collarboneY);
  ctx.lineTo(placement.x + placement.width * 0.32, placement.collarboneY);
  ctx.stroke();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// Offscreen canvas for necklace isolation (Fix #1)
// Prevents destination-out jaw occlusion from erasing other jewelry
// ═══════════════════════════════════════════════════════════════════════
let _necklaceOffscreen = null;
function getNecklaceOffscreenCanvas(w, h) {
  if (!_necklaceOffscreen || _necklaceOffscreen.width !== w || _necklaceOffscreen.height !== h) {
    _necklaceOffscreen = document.createElement('canvas');
    _necklaceOffscreen.width = w;
    _necklaceOffscreen.height = h;
  }
  return _necklaceOffscreen;
}

// ═══════════════════════════════════════════════════════════════════════
// Debug landmarks cache (Fix #5)
// Render landmarks to offscreen canvas only when data changes,
// then blit the cached result each frame
// ═══════════════════════════════════════════════════════════════════════
let _landmarkCache = null;
let _landmarkCacheKey = '';
let _landmarkFrameSkip = 0;

function drawCachedLandmarks(ctx, landmarks, w, h) {
  // Only re-render every 3rd frame and when landmark data changes
  _landmarkFrameSkip = (_landmarkFrameSkip + 1) % 3;

  // Create a simple hash of landmark positions to detect changes
  const keyLandmarks = [1, 10, 33, 152, 234, 263, 454]; // nose, forehead, eyes, chin, ears
  const cacheKey = keyLandmarks.map(i => {
    const lm = landmarks[i];
    return lm ? `${Math.round(lm.px)},${Math.round(lm.py)}` : 'x';
  }).join('|');

  const needsRedraw = cacheKey !== _landmarkCacheKey || !_landmarkCache ||
    _landmarkCache.width !== w || _landmarkCache.height !== h;

  if (needsRedraw && _landmarkFrameSkip === 0) {
    if (!_landmarkCache || _landmarkCache.width !== w || _landmarkCache.height !== h) {
      _landmarkCache = document.createElement('canvas');
      _landmarkCache.width = w;
      _landmarkCache.height = h;
    }
    const lctx = _landmarkCache.getContext('2d');
    lctx.clearRect(0, 0, w, h);

    // Batch all landmark dots into a single path — much faster than 468 individual arc() calls
    lctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    lctx.beginPath();
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (!lm) continue;
      // Use fillRect for speed (3x faster than arc at 1.5px)
      lctx.rect(lm.px - 1, lm.py - 1, 2, 2);
    }
    lctx.fill();

    _landmarkCacheKey = cacheKey;
  }

  // Blit cached landmark overlay
  if (_landmarkCache) {
    ctx.drawImage(_landmarkCache, 0, 0);
  }
}


// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export default function JewelryOverlay({ canvasRef, cameraControlRef, landmarks, selectedJewelry, earDetections, neckDetections, poseNeck, handLandmarks }) {
  const { faceMetrics, debugMode, faceDetected } = useAR();
  const rafRef = useRef(null);
  const frameStateRef = useRef({
    landmarks,
    selectedJewelry,
    faceMetrics,
    debugMode,
    faceDetected,
    earDetections,
    neckDetections,
    poseNeck,
    handLandmarks,
  });

  useEffect(() => {
    frameStateRef.current = {
      landmarks,
      selectedJewelry,
      faceMetrics,
      debugMode,
      faceDetected,
      earDetections,
      neckDetections,
      poseNeck,
      handLandmarks,
    };
  }, [landmarks, selectedJewelry, faceMetrics, debugMode, faceDetected, earDetections, neckDetections, poseNeck, handLandmarks]);

  const draw = useCallback(() => {
    const canvas = canvasRef?.current;
    const video = cameraControlRef?.current?.videoElement;
    if (!canvas || !video) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const {
      landmarks: currentLandmarks,
      selectedJewelry: currentSelectedJewelry,
      faceMetrics: currentFaceMetrics,
      debugMode: currentDebugMode,
      faceDetected: currentFaceDetected,
      earDetections: currentEarDetections,
      neckDetections: currentNeckDetections,
      poseNeck: currentPoseNeck,
      handLandmarks: currentHandLandmarks,
    } = frameStateRef.current;
    const w = video.videoWidth || video.clientWidth || 640;
    const h = video.videoHeight || video.clientHeight || 480;

    syncCanvasToVideo(canvas, video, w, h);
    ctx.clearRect(0, 0, w, h);

    if (!currentLandmarks || currentLandmarks.length === 0 || !currentFaceDetected) {
      resetAllStabilizers();
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    // Fix #5: Use cached batch-rendered landmarks for debug mode
    if (currentDebugMode) {
      drawCachedLandmarks(ctx, currentLandmarks, w, h);
    }

    const fw = currentFaceMetrics?.face_width || 200;
    const fh = currentFaceMetrics?.face_height || 250;
    const roll = currentFaceMetrics?.roll || 0;

    // ═══════════════════════════════════════════════════════════════
    // Fix #1: Sort items by render priority for deterministic layering
    // Body jewelry (necklace, bangle) → face jewelry (earrings, nose, nethi)
    // ═══════════════════════════════════════════════════════════════
    const sortedItems = Object.entries(currentSelectedJewelry)
      .filter(([, item]) => item?.image_2d)
      .map(([category, item]) => ({
        category,
        item,
        catSlug: category.toLowerCase().replace(/[-\s]/g, ''),
        priority: getRenderPriority(category.toLowerCase().replace(/[-\s]/g, '')),
      }))
      .sort((a, b) => a.priority - b.priority);

    if (sortedItems.length === 0) {
      resetAllStabilizers();
    }

    for (const { catSlug, item } of sortedItems) {
      const img = getLoadedImage(item.image_2d);
      if (!img) continue;

      if (catSlug.includes('necklace')) {
        // Fix #1: Draw necklace + jaw occlusion on offscreen canvas,
        // then composite result onto main canvas.
        // This isolates destination-out from erasing other jewelry.
        drawNecklaceIsolated(ctx, img, currentLandmarks, fw, fh, roll, currentNeckDetections, currentPoseNeck, w, h, currentDebugMode);
      } else if (catSlug.includes('earring')) {
        drawEarrings(ctx, img, currentLandmarks, currentFaceMetrics, fw, fh, roll, currentEarDetections, w, h);
      } else if (catSlug.includes('nose') || catSlug.includes('mukuthi')) {
        drawNosePin(ctx, img, currentLandmarks, fw, fh, roll, w, h);
      } else if (catSlug.includes('nethi') || catSlug.includes('chudi') || catSlug.includes('forehead')) {
        drawNethiChudi(ctx, img, currentLandmarks, fw, fh, roll);
      } else if (catSlug.includes('ring')) {
        drawRing(ctx, img, currentHandLandmarks, fw, w, h);
      } else if (catSlug.includes('bangle')) {
        drawBangle(ctx, img, currentHandLandmarks, fw, w, h);
      }
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [canvasRef, cameraControlRef]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// NECKLACE ISOLATED — Offscreen canvas prevents occlusion conflict
// Fix #1: All necklace rendering + jaw occlusion happens on a temp canvas
// ═══════════════════════════════════════════════════════════════════════

function drawNecklaceIsolated(mainCtx, img, landmarks, faceWidth, faceHeight, roll, neckDetections, poseNeck, imgW, imgH, debugMode) {
  const offscreen = getNecklaceOffscreenCanvas(imgW, imgH);
  const ctx = offscreen.getContext('2d');
  ctx.clearRect(0, 0, imgW, imgH);

  // Draw necklace on offscreen canvas
  const renderProfile = getNecklaceRenderProfile(img);
  const placement = getNecklacePlacement(
    landmarks,
    faceWidth,
    faceHeight,
    neckDetections,
    poseNeck,
    imgW,
    imgH,
    img.height / img.width,
    renderProfile
  );
  if (!placement) return;

  const smoothedZScale = stabilizers.necklace.zScale ? stabilizers.necklace.zScale.update(placement.zDepthScale ?? 1) : 1;
  const minWidth = Math.max(
    faceWidth * (renderProfile.minWidthScale ?? 0.78),
    placement.width * 0.86
  );
  const maxWidth = Math.max(
    faceWidth * (renderProfile.maxWidthScale ?? 1.12),
    placement.width * 1.08
  );
  const rawW = clamp(
    placement.width * smoothedZScale * renderProfile.widthScale,
    minWidth,
    maxWidth
  );
  const placementAspectRatio = placement.height / Math.max(placement.width, 1);
  let adjustedW = rawW;
  let adjustedH = rawW * placementAspectRatio * renderProfile.heightScale;
  const meta = img?._jewelryMeta || {};
  const anchorXRatio = meta.topAnchorXRatio ?? 0.5;
  const anchorYRatio = renderProfile.anchorYRatio ?? clamp(meta.topAnchorYRatio ?? 0.10, 0.07, 0.18);
  const visibleCenterXRatio = meta.centerMassXRatio ?? anchorXRatio;
  const visibleCenterYRatio = meta.centerMassYRatio ?? clamp(anchorYRatio + 0.26, 0.34, 0.60);
  const centerMassBlend = renderProfile.centerMassBlend ?? 0.08;
  const maxBottomY = Math.min(
    imgH - 8,
    placement.collarboneY + faceHeight * (renderProfile.maxBottomOffsetScale ?? 0.78)
  );
  const projectedBottomY = placement.y + adjustedH * (1 - visibleCenterYRatio);

  if (projectedBottomY > maxBottomY) {
    const fitScale = clamp(
      (maxBottomY - placement.y) / Math.max(adjustedH * (1 - visibleCenterYRatio), 1),
      0.55,
      1
    );
    adjustedW *= fitScale;
    adjustedH *= fitScale;
  }

  const size = stabilizers.necklace.size.smooth(adjustedW, adjustedH);
  const targetXRatio = lerp(anchorXRatio, visibleCenterXRatio, 0.06);
  const targetYRatio = lerp(anchorYRatio, visibleCenterYRatio, centerMassBlend);
  const renderX = placement.x - (targetXRatio - anchorXRatio) * size.width;
  const renderY = placement.y - (targetYRatio - anchorYRatio) * size.height;
  const pos = stabilizers.necklace.pos.smooth(
    renderX,
    renderY + size.height * renderProfile.anchorOffsetY
  );

  const rawRot = clamp(poseNeck?.angle ?? 0, -Math.PI / 6, Math.PI / 6);
  const rotation = (stabilizers.necklace.rot.smooth(rawRot * (180 / Math.PI)) * Math.PI) / 180;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.globalAlpha = placement.confidence > 0.7 ? 0.93 : 0.88;
  drawAnchoredImage(ctx, img, size.width, size.height, anchorXRatio, anchorYRatio);
  ctx.restore();

  // Apply jaw occlusion only to this offscreen canvas — not the main canvas!
  applyJawOcclusion(ctx, landmarks, faceWidth, false);

  // Composite the result onto the main canvas
  mainCtx.drawImage(offscreen, 0, 0);

  // Debug overlays go directly on main canvas (after composite)
  if (debugMode) {
    drawNeckDebug(mainCtx, placement);
    applyJawOcclusionDebug(mainCtx, landmarks, faceWidth);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// JAW OCCLUSION — Chin sits in front of necklace
// Now only applied to the necklace offscreen canvas
// ═══════════════════════════════════════════════════════════════════════

function applyJawOcclusion(ctx, landmarks, faceWidth, debugMode) {
  const JAW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 379, 365, 288, 361, 323, 454];
  const pts = JAW.map(i => landmarks[i]).filter(Boolean);
  if (pts.length < 6) return;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 0.72;
  ctx.beginPath();
  ctx.moveTo(pts[0].px, pts[0].py);
  for (let i = 1; i < pts.length - 1; i++) {
    const cpX = (pts[i].px + pts[i + 1].px) / 2;
    const cpY = (pts[i].py + pts[i + 1].py) / 2;
    ctx.quadraticCurveTo(pts[i].px, pts[i].py, cpX, cpY);
  }
  ctx.lineTo(pts[pts.length - 1].px, pts[pts.length - 1].py);
  const topY = Math.min(...pts.map(p => p.py)) - faceWidth * 0.07;
  ctx.lineTo(pts[pts.length - 1].px, topY);
  ctx.lineTo(pts[0].px, topY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Separate debug visualization for jaw occlusion (drawn on main canvas)
function applyJawOcclusionDebug(ctx, landmarks, faceWidth) {
  const JAW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 379, 365, 288, 361, 323, 454];
  const pts = JAW.map(i => landmarks[i]).filter(Boolean);
  if (pts.length < 6) return;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pts[0].px, pts[0].py);
  pts.forEach(p => ctx.lineTo(p.px, p.py));
  ctx.stroke();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// EARRINGS — Precise ear-lobe anchoring with yaw visibility
// ═══════════════════════════════════════════════════════════════════════

function drawEarrings(ctx, img, landmarks, faceMetrics, faceWidth, faceHeight, roll, earDetections, imgW, imgH) {
  const pose = getFacePose(landmarks, faceWidth, faceHeight, faceMetrics);
  const yaw = pose.yaw;

  const leftOuter = landmarks[234];
  const rightOuter = landmarks[454];
  const leftBottom = landmarks[177];
  const rightBottom = landmarks[401];
  const noseTip = landmarks[1];
  if (!leftOuter || !rightOuter || !leftBottom || !rightBottom) return;

  const faceCenterX = ((leftOuter.px + rightOuter.px) / 2 + (noseTip?.px ?? (leftOuter.px + rightOuter.px) / 2)) / 2;
  const horizontalEarSpan = Math.max(Math.abs(rightOuter.px - leftOuter.px), faceWidth * 0.80, 1);
  const lateralOffset = clamp(faceWidth * 0.02, 5, 12);
  const verticalLift = clamp(faceHeight * 0.028, 8, 18);
  const frontFacing = pose.frontFacing;
  const symmetryOffset = horizontalEarSpan / 2 + lateralOffset;
  const symmetricAnchorY = ((leftBottom.py + rightBottom.py) / 2) - verticalLift;

  const avgEarZ = ((leftOuter.z ?? 0) + (rightOuter.z ?? 0)) / 2;
  const faceDepth = ((noseTip?.z ?? avgEarZ) + avgEarZ) / 2;
  const depthScale = clamp(1 - faceDepth * 0.5, 0.78, 1.36);

  const sides = [
    { key: 'left', outer: leftOuter, bottom: leftBottom, stab: stabilizers.leftEar, mirror: false },
    { key: 'right', outer: rightOuter, bottom: rightBottom, stab: stabilizers.rightEar, mirror: true },
  ];

  for (const { key, outer, bottom, stab, mirror } of sides) {
    if (!outer || !bottom) continue;

    // ── YAW VISIBILITY ──
    const yawVisibility = frontFacing
      ? 0.98
      : key === 'left'
        ? clamp(1 + yaw * 0.8, 0.0, 1.0)
        : clamp(1 - yaw * 0.8, 0.0, 1.0);

    if (yawVisibility < 0.08) continue;

    // ── YAW SIZE SCALING ──
    const yawSizeScale = frontFacing
      ? 1
      : key === 'left'
        ? clamp(1 + yaw * 0.15, 0.6, 1.25)
        : clamp(1 - yaw * 0.15, 0.6, 1.25);

    let anchorX;
    let anchorY;
    const useEarDetection = !frontFacing && earDetections && earDetections[key] && earDetections[key].conf > 0.4;

    if (useEarDetection) {
      const ed = earDetections[key];
      anchorX = (ed.x + ed.w / 2) * imgW + (key === 'left' ? -lateralOffset : lateralOffset);
      anchorY = (ed.y + ed.h * 0.70) * imgH;
    } else if (frontFacing) {
      anchorX = faceCenterX + (key === 'left' ? -symmetryOffset : symmetryOffset);
      anchorY = symmetricAnchorY;
    } else {
      anchorX = outer.px + (key === 'left' ? -lateralOffset : lateralOffset) + yaw * faceWidth * 0.01;
      anchorY = bottom.py - verticalLift;
    }

    const sideDepthScale = clamp(
      depthScale * (1 - ((outer.z ?? avgEarZ) - avgEarZ) * 0.8),
      0.72,
      1.42
    );
    const baseW = faceWidth * 0.20 * yawSizeScale * sideDepthScale;
    const aspect = img.height / Math.max(img.width, 1);
    let earW = clamp(baseW, faceWidth * 0.10, faceWidth * 0.35);
    let earH = earW * aspect;
    const maxEarringHeight = faceHeight * 0.62;
    if (earH > maxEarringHeight) {
      const scale = maxEarringHeight / earH;
      earW *= scale;
      earH = maxEarringHeight;
    }

    const pos = stab.pos.smooth(anchorX, anchorY);
    const size = stab.size.smooth(earW, earH);
    const smoothRoll = stab.rot.smooth(roll);
    const meta = img?._jewelryMeta || {};
    const anchorXRatio = mirror
      ? 1 - (meta.topAnchorXRatio ?? 0.5)
      : (meta.topAnchorXRatio ?? 0.5);
    const anchorYRatio = meta.topAnchorYRatio ?? 0.10;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate((smoothRoll * Math.PI) / 180);
    if (mirror) ctx.scale(-1, 1);
    ctx.globalAlpha = clamp(0.95 * yawVisibility, 0.0, 0.97);
    drawAnchoredImage(ctx, img, size.width, size.height, anchorXRatio, anchorYRatio);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// NOSE PIN — Precise nostril anchoring with yaw compensation
// ═══════════════════════════════════════════════════════════════════════

function drawNosePin(ctx, img, landmarks, faceWidth, faceHeight, roll, imgW, imgH) {
  const noseTip = landmarks[1];
  const noseBottom = landmarks[2];
  const noseLeft = landmarks[129];
  const noseRight = landmarks[358];
  const nostrilLeft = landmarks[48];
  const nostrilRight = landmarks[278];
  if (!noseTip || !noseBottom || !noseLeft) return;

  const yaw = estimateYaw(landmarks, faceWidth);

  let pinX, pinY;
  if (nostrilLeft) {
    const hiddenFactor = clamp((-yaw - 0.2) / 0.8, 0, 1);
    const inwardTargetX = noseLeft ? (nostrilLeft.px + noseLeft.px) / 2 : nostrilLeft.px;
    const inwardTargetY = noseBottom ? (nostrilLeft.py + noseBottom.py) / 2 : nostrilLeft.py;
    pinX = nostrilLeft.px * (1 - hiddenFactor * 0.35) + inwardTargetX * (hiddenFactor * 0.35);
    pinY = nostrilLeft.py * (1 - hiddenFactor * 0.2) + inwardTargetY * (hiddenFactor * 0.2);
  } else if (nostrilRight && noseTip) {
    pinX = nostrilRight.px - Math.abs(nostrilRight.px - noseTip.px) * 0.55;
    pinY = nostrilRight.py;
  } else {
    pinX = (noseTip.px + noseLeft.px) / 2;
    pinY = noseBottom.py;
  }

  const noseZ = noseTip.z ?? 0;
  const depthScale = clamp(1 + noseZ * 0.3, 0.6, 1.5);
  const noseWidth = noseRight ? Math.abs(noseLeft.px - noseRight.px) : faceWidth * 0.15;
  const pinSize = clamp(noseWidth * 0.24 * depthScale, faceWidth * 0.022, faceWidth * 0.075);
  const aspect = img.height / Math.max(img.width, 1);

  const pos = stabilizers.nosePin.pos.smooth(pinX, pinY);
  const size = stabilizers.nosePin.size.smooth(pinSize, pinSize * aspect);
  const smoothRoll = stabilizers.nosePin.rot.smooth(roll);
  const meta = img?._jewelryMeta || {};
  const anchorXRatio = meta.centerMassXRatio ?? 0.5;
  const anchorYRatio = meta.centerMassYRatio ?? 0.5;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((smoothRoll * Math.PI) / 180);
  ctx.globalAlpha = 0.95;
  drawAnchoredImage(ctx, img, size.width, size.height, anchorXRatio, anchorYRatio);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// NETHI CHUDI — Forehead-anchored with multi-landmark precision
// ═══════════════════════════════════════════════════════════════════════

function drawNethiChudi(ctx, img, landmarks, faceWidth, faceHeight, roll) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const pose = estimateNethiHeadPose(landmarks, roll);
  const upperForehead = pose.upperForehead;
  const noseBridge = pose.noseBridge;
  if (!leftEye || !rightEye || !upperForehead || !noseBridge) return;

  const desiredCenterX = pose.eyeMidX;
  const desiredCenterY = pose.verticalAnchorY;
  const eyeDistance = Math.max(pose.eyeDistance, faceWidth * 0.24);
  const anchorDepth = ((upperForehead.z ?? 0) + (noseBridge.z ?? upperForehead.z ?? 0)) / 2;
  const depthScale = clamp(1 + anchorDepth * 0.22, 0.76, 1.28);
  const yaw = estimateYaw(landmarks, faceWidth);
  const yawScale = pose.isStraight ? 1 : clamp(1 - Math.abs(yaw) * 0.10, 0.82, 1.0);

  const aspect = img.height / Math.max(img.width, 1);
  let chudiW = clamp(eyeDistance * 0.62 * depthScale * yawScale, faceWidth * 0.12, faceWidth * 0.28);
  let chudiH = chudiW * aspect;
  const maxChudiHeight = faceHeight * 0.58;
  if (chudiH > maxChudiHeight) {
    const scale = maxChudiHeight / chudiH;
    chudiW *= scale;
    chudiH = maxChudiHeight;
  }

  const size = stabilizers.nethiChudi.size.smooth(chudiW, chudiH);
  const targetRoll = pose.isStraight && Math.abs(pose.correctedRoll) < 2 ? 0 : pose.correctedRoll;
  const smoothRoll = stabilizers.nethiChudi.rot.smooth(targetRoll);
  const meta = img?._jewelryMeta || {};
  const anchorXRatio = meta.topAnchorXRatio ?? 0.5;
  const anchorYRatio = meta.topAnchorYRatio ?? 0.09;
  const visibleCenterXRatio = meta.centerMassXRatio ?? anchorXRatio;
  const visibleCenterYRatio = meta.centerMassYRatio ?? Math.max(anchorYRatio + 0.32, 0.45);
  const renderX = desiredCenterX - (visibleCenterXRatio - anchorXRatio) * size.width;
  const renderY = desiredCenterY - (visibleCenterYRatio - anchorYRatio) * size.height;
  const pos = stabilizers.nethiChudi.ema.smooth(renderX, renderY);

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((smoothRoll * Math.PI) / 180);
  ctx.globalAlpha = 0.95;
  drawAnchoredImage(ctx, img, size.width, size.height, anchorXRatio, anchorYRatio);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// RING — Fix #3: Proper finger-base anchoring with perspective
// ═══════════════════════════════════════════════════════════════════════

function drawRing(ctx, img, handLandmarks, faceWidth, imgW, imgH) {
  if (!handLandmarks || handLandmarks.length === 0) return;

  // MediaPipe Hand landmarks:
  //   0 = wrist
  //   5 = index finger MCP
  //   9 = middle finger MCP
  //  13 = ring finger MCP
  //  14 = ring finger PIP
  //  17 = pinky MCP
  const hand = getPrimaryTrackedHand(handLandmarks, imgW, imgH);
  if (!hand || hand.length < 21) return;

  const wrist = hand[0];
  const ringMCP = hand[13];   // Ring finger base joint
  const ringPIP = hand[14];   // Ring finger first knuckle
  const middleMCP = hand[9];
  const indexMCP = hand[5];
  const pinkyMCP = hand[17];

  if (!ringMCP || !ringPIP || !wrist) return;

  // Place the ring low on the finger, closer to the base than the knuckle.
  const ringX = (ringMCP.x * 0.62 + ringPIP.x * 0.38) * imgW;
  const ringY = (ringMCP.y * 0.62 + ringPIP.y * 0.38) * imgH;

  const handSize = Math.hypot((middleMCP.x - wrist.x) * imgW, (middleMCP.y - wrist.y) * imgH);
  const fingerLength = Math.hypot(
    (ringPIP.x - ringMCP.x) * imgW,
    (ringPIP.y - ringMCP.y) * imgH
  );
  const localFingerSpread = (
    Math.hypot((middleMCP.x - ringMCP.x) * imgW, (middleMCP.y - ringMCP.y) * imgH)
    + Math.hypot((pinkyMCP.x - ringMCP.x) * imgW, (pinkyMCP.y - ringMCP.y) * imgH)
  ) / 2;
  const palmSpread = Math.hypot((indexMCP.x - pinkyMCP.x) * imgW, (indexMCP.y - pinkyMCP.y) * imgH);
  const fingerDiameter = Math.max(localFingerSpread * 0.72, fingerLength * 0.42, handSize * 0.08);
  const ringSize = clamp(Math.min(fingerDiameter * 1.85, palmSpread * 0.40), 18, 84);

  // Catalog ring PNGs are usually drawn with the band horizontal.
  // To sit naturally on the finger, align the image crosswise to the finger axis,
  // then keep it within an upright range so it never feels upside-down.
  const fingerAngle = Math.atan2(
    (ringPIP.y - ringMCP.y) * imgH,
    (ringPIP.x - ringMCP.x) * imgW
  );
  const ringAngle = normalizeUprightAngle(fingerAngle + Math.PI / 2);

  // Perspective foreshortening: when finger points away, ring appears as an ellipse
  const zDelta = Math.abs((ringPIP.z ?? 0) - (ringMCP.z ?? 0));
  const perspectiveScale = clamp(1 - zDelta * 1.8, 0.48, 1.0);

  const pos = stabilizers.ring.pos.smooth(ringX, ringY);
  const imgAspect = img.height / Math.max(img.width, 1);
  const size = stabilizers.ring.size.smooth(ringSize * perspectiveScale, ringSize * imgAspect);
  const smoothRot = stabilizers.ring.rot.smooth(ringAngle * (180 / Math.PI));
  const meta = img?._jewelryMeta || {};
  const anchorXRatio = meta.centerMassXRatio ?? 0.5;
  const anchorYRatio = meta.centerMassYRatio ?? 0.5;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((smoothRot * Math.PI) / 180);
  ctx.globalAlpha = 0.92;
  drawAnchoredImage(ctx, img, size.width, size.height, anchorXRatio, anchorYRatio);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════
// BANGLE — Fix #3: Forearm-offset wrist anchoring with perspective ellipse
// ═══════════════════════════════════════════════════════════════════════

function drawBangle(ctx, img, handLandmarks, faceWidth, imgW, imgH) {
  if (!handLandmarks || handLandmarks.length === 0) return;

  const hand = getPrimaryTrackedHand(handLandmarks, imgW, imgH);
  if (!hand || hand.length < 21) return;

  const wrist = hand[0];
  const indexMCP = hand[5];
  const pinkyMCP = hand[17];
  const middleMCP = hand[9];

  if (!wrist || !indexMCP || !pinkyMCP || !middleMCP) return;

  // Fix #3: Offset wrist anchor toward the forearm (away from palm center)
  // The wrist landmark[0] is at the palm base; actual bangles sit on the forearm side
  const palmDirX = (middleMCP.x - wrist.x);
  const palmDirY = (middleMCP.y - wrist.y);
  // Push 20% past the wrist AWAY from the palm (negative direction)
  const bangleAnchorX = (wrist.x - palmDirX * 0.20) * imgW;
  const bangleAnchorY = (wrist.y - palmDirY * 0.20) * imgH;

  // Wrist width from MCP spread
  const wristWidth = Math.hypot(
    (indexMCP.x - pinkyMCP.x) * imgW,
    (indexMCP.y - pinkyMCP.y) * imgH
  );

  const bangleSize = clamp(wristWidth * 1.4, 35, 160);

  // Wrist angle — aligned to the arm direction
  const wristAngle = Math.atan2(
    (middleMCP.y - wrist.y) * imgH,
    (middleMCP.x - wrist.x) * imgW
  );

  // Fix #3: Perspective ellipse — when wrist is angled, bangle appears as an ellipse
  const wristZDelta = Math.abs((middleMCP.z ?? 0) - (wrist.z ?? 0));
  const perspectiveScaleX = clamp(1 - wristZDelta * 1.5, 0.45, 1.0);

  const pos = stabilizers.bangle.pos.smooth(bangleAnchorX, bangleAnchorY);
  const imgAspect = img.height / Math.max(img.width, 1);
  const size = stabilizers.bangle.size.smooth(
    bangleSize * perspectiveScaleX,
    bangleSize * imgAspect
  );
  const smoothRot = stabilizers.bangle.rot.smooth(wristAngle * (180 / Math.PI));

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate((smoothRot * Math.PI) / 180);
  ctx.globalAlpha = 0.92;
  ctx.drawImage(img, -size.width / 2, -size.height / 2, size.width, size.height);
  ctx.restore();
}
