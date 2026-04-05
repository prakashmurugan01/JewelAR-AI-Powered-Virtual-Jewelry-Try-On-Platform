import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';

const TASKS_VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm';
const HOLISTIC_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task';

function makeEMA(alpha = 0.75) {
  let prev = null;
  return (value) => {
    if (prev === null) {
      prev = value;
      return value;
    }
    prev = alpha * prev + (1 - alpha) * value;
    return prev;
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeShoulderAngle(angle) {
  if (angle > Math.PI / 2) return angle - Math.PI;
  if (angle < -Math.PI / 2) return angle + Math.PI;
  return angle;
}

function getVideoFrameSize(video) {
  return {
    width: video?.videoWidth || video?.clientWidth || 640,
    height: video?.videoHeight || video?.clientHeight || 480,
  };
}

function createEmptyFaceState(width = 0, height = 0) {
  return {
    face_detected: false,
    landmarks: [],
    face_metrics: {},
    image_size: { width, height },
  };
}

function mapFaceLandmarks(normalizedLandmarks, width, height) {
  if (!Array.isArray(normalizedLandmarks) || normalizedLandmarks.length === 0) {
    return [];
  }

  return normalizedLandmarks.map((lm, index) => ({
    id: index,
    x: lm.x,
    y: lm.y,
    z: lm.z ?? 0,
    visibility: lm.visibility,
    px: Math.round(lm.x * width),
    py: Math.round(lm.y * height),
  }));
}

function estimateFacePoseMetrics(landmarks, faceWidth, faceHeight) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const noseTip = landmarks[1];
  const noseBridge = landmarks[6] || noseTip;
  const leftTemple = landmarks[127] || leftEar;
  const rightTemple = landmarks[356] || rightEar;

  if (!leftEye || !rightEye || !leftEar || !rightEar || !forehead || !chin || !noseTip) {
    return {
      yaw: 0,
      pitch: 0,
      roll: 0,
      yaw_degrees: 0,
      pitch_degrees: 0,
      ear_depth_gap: 0,
      front_facing: true,
      front_facing_score: 1,
    };
  }

  const faceCenterX = (leftEar.px + rightEar.px) / 2;
  const horizontalSpan = Math.max(Math.abs(rightEar.px - leftEar.px), faceWidth * 0.82, 1);
  const horizontalBias = (noseTip.px - faceCenterX) / Math.max(horizontalSpan * 0.18, 1);
  const leftNoseDistance = Math.hypot(noseTip.px - leftEar.px, noseTip.py - leftEar.py);
  const rightNoseDistance = Math.hypot(noseTip.px - rightEar.px, noseTip.py - rightEar.py);
  const distanceBias = (leftNoseDistance - rightNoseDistance) / Math.max(faceWidth * 0.32, 1);
  const depthBias = ((leftEar.z ?? 0) - (rightEar.z ?? 0)) * 2.6;
  const templeDepthBias = ((leftTemple.z ?? leftEar.z ?? 0) - (rightTemple.z ?? rightEar.z ?? 0)) * 1.4;
  const yaw = clamp(
    horizontalBias * 0.46 + distanceBias * 0.32 + depthBias * 0.40 + templeDepthBias * 0.18,
    -1,
    1
  );

  const eyeCenterY = (leftEye.py + rightEye.py) / 2;
  const noseCenterBias = (noseTip.py - (eyeCenterY + chin.py) / 2) / Math.max(faceHeight * 0.16, 1);
  const depthPitchBias = ((noseBridge.z ?? noseTip.z ?? 0) - (chin.z ?? 0)) * 1.6
    + ((noseTip.z ?? 0) - (forehead.z ?? 0)) * 0.8;
  const pitch = clamp(noseCenterBias * 0.62 - depthPitchBias * 0.30, -1, 1);

  const roll = Math.atan2(rightEye.py - leftEye.py, rightEye.px - leftEye.px) * (180 / Math.PI);
  const yawDegrees = yaw * 28;
  const pitchDegrees = pitch * 20;
  const earDepthGap = Math.abs((leftEar.z ?? 0) - (rightEar.z ?? 0));
  const frontFacingScore = clamp(
    1 - Math.abs(yawDegrees) / 14 - earDepthGap / 0.06 - Math.abs(roll) / 22,
    0,
    1
  );

  return {
    yaw,
    pitch,
    roll,
    yaw_degrees: yawDegrees,
    pitch_degrees: pitchDegrees,
    ear_depth_gap: earDepthGap,
    front_facing: Math.abs(yawDegrees) < 10 && earDepthGap < 0.045,
    front_facing_score: frontFacingScore,
  };
}

function buildFaceState(normalizedLandmarks, width, height) {
  const landmarks = mapFaceLandmarks(normalizedLandmarks, width, height);
  if (landmarks.length === 0) {
    return null;
  }

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftEar = landmarks[234];
  const rightEar = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const noseTip = landmarks[1];

  if (!leftEye || !rightEye || !leftEar || !rightEar || !forehead || !chin || !noseTip) {
    return null;
  }

  const iod = Math.hypot(leftEye.px - rightEye.px, leftEye.py - rightEye.py);
  const faceWidth = Math.hypot(leftEar.px - rightEar.px, leftEar.py - rightEar.py);
  const faceHeight = Math.hypot(forehead.px - chin.px, forehead.py - chin.py);
  const poseMetrics = estimateFacePoseMetrics(landmarks, faceWidth, faceHeight);

  return {
    face_detected: true,
    landmarks,
    face_metrics: {
      iod,
      face_width: faceWidth,
      face_height: faceHeight,
      left_ear: leftEar,
      right_ear: rightEar,
      chin,
      forehead,
      nose_tip: noseTip,
      ...poseMetrics,
    },
    image_size: { width, height },
  };
}

function buildPoseNeck(poseLandmarks, faceLandmarks, smoothDepth, source = 'pose') {
  if (!Array.isArray(poseLandmarks) || poseLandmarks.length === 0) {
    return null;
  }

  const leftShoulder = poseLandmarks[11];
  const rightShoulder = poseLandmarks[12];
  if (!leftShoulder || !rightShoulder) {
    return null;
  }

  const leftVisibility = leftShoulder.visibility ?? 0;
  const rightVisibility = rightShoulder.visibility ?? 0;
  const shoulderVisibility = Math.min(leftVisibility, rightVisibility);
  if (shoulderVisibility < 0.25) {
    return null;
  }

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const shoulderDist = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y
  );

  const rawDepth = -((leftShoulder.z ?? 0) + (rightShoulder.z ?? 0)) / 2;
  const smoothedDepth = smoothDepth(rawDepth);
  const zDepth = clamp(smoothedDepth, -0.6, 0.6);
  const shoulderAngle = normalizeShoulderAngle(Math.atan2(
    rightShoulder.y - leftShoulder.y,
    rightShoulder.x - leftShoulder.x
  ));

  const chinLandmark = faceLandmarks?.[152];
  const chinY = chinLandmark?.y;
  const chinX = chinLandmark?.x;
  const hasFaceAnchor = typeof chinY === 'number' && shoulderMidY > chinY;

  const shoulderGap = hasFaceAnchor
    ? Math.max(shoulderMidY - chinY, shoulderDist * 0.22)
    : Math.max(shoulderDist * 0.28, 0.09);
  const collarboneY = hasFaceAnchor
    ? chinY + shoulderGap * 0.92
    : shoulderMidY - shoulderDist * 0.03;
  const neckCenterY = hasFaceAnchor
    ? chinY + shoulderGap * 0.68
    : shoulderMidY - shoulderDist * 0.12;
  const neckCenterX = typeof chinX === 'number'
    ? shoulderMidX + (chinX - shoulderMidX) * 0.15
    : shoulderMidX;
  const neckWidth = clamp(
    Math.max(shoulderDist * 0.60, 0.16),
    0.16,
    Math.max(shoulderDist * 0.82, 0.16)
  );

  let confidence = hasFaceAnchor ? 0.8 : 0.66;
  confidence += shoulderVisibility * 0.18;
  if (source === 'holistic') {
    confidence += 0.04;
  }

  return {
    neck_center_x: neckCenterX,
    neck_center_y: neckCenterY,
    neck_width: neckWidth,
    shoulder_width: Math.max(shoulderDist, 0.08),
    collarbone_y: collarboneY,
    angle: shoulderAngle,
    z_depth: zDepth,
    confidence: clamp(confidence, 0, 0.99),
    source,
  };
}

const WebcamCapture = forwardRef(({ onLandmarks, canvasRef }, ref) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const onLandmarksRef = useRef(onLandmarks);
  const startInFlightRef = useRef(false);
  const cameraRequestIdRef = useRef(0);
  const faceMeshRef = useRef(null);
  const poseRef = useRef(null);
  const holisticRef = useRef(null);
  const taskCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const detectorActiveRef = useRef(false);
  const detectorModeRef = useRef('none');
  const latestFaceStateRef = useRef(createEmptyFaceState());
  const latestPoseNeckRef = useRef(null);
  const latestHandRef = useRef(null);
  const startRequestedRef = useRef(false);
  const emaDepthRef = useRef(makeEMA(0.55));
  // ═ Detector Heartbeat (Fix #1) ═
  const lastDetectionTimeRef = useRef(Date.now());
  const detectorTimeoutRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [mirrored] = useState(true);

  useEffect(() => {
    onLandmarksRef.current = onLandmarks;
  }, [onLandmarks]);

  const emitLandmarksUpdate = useCallback(() => {
    if (!onLandmarksRef.current) return;

    const { face_detected, landmarks, face_metrics, image_size } = latestFaceStateRef.current;
    onLandmarksRef.current({
      face_detected,
      landmarks,
      face_metrics,
      image_size,
      pose_neck: latestPoseNeckRef.current,
      hand_landmarks: latestHandRef.current,
    });
  }, []);

  const publishTrackingState = useCallback(({
    faceState = latestFaceStateRef.current,
    poseNeck = latestPoseNeckRef.current,
    handLandmarks = latestHandRef.current,
  } = {}) => {
    latestFaceStateRef.current = faceState;
    latestPoseNeckRef.current = poseNeck;
    latestHandRef.current = handLandmarks;
    emitLandmarksUpdate();
  }, [emitLandmarksUpdate]);

  const updateFaceState = useCallback((data) => {
    publishTrackingState({
      faceState: {
        ...latestFaceStateRef.current,
        ...data,
      },
    });
  }, [publishTrackingState]);

  const updatePoseNeck = useCallback((poseNeck) => {
    publishTrackingState({ poseNeck });
  }, [publishTrackingState]);

  // ═ Detector Heartbeat Reset (Fix #1) ═
  const resetDetectorHeartbeat = useCallback(() => {
    lastDetectionTimeRef.current = Date.now();
    if (detectorTimeoutRef.current) {
      clearTimeout(detectorTimeoutRef.current);
    }
    detectorTimeoutRef.current = setTimeout(() => {
      console.warn('[WebcamCapture] Detection timeout 3s - restarting detector');
      if (detectorActiveRef.current) {
        stopDetectionLoop();  // Sets active to false and clears animFrame
        // Don't manually set active=true; let startDetectionLoop do it after checking conditions
        startDetectionLoop();  // This will check conditions and restart properly
      }
    }, 3000);
  }, []);

  // ═ Debug: Log Detector Status (Fix #3) ═
  const logDetectorStatus = useCallback(() => {
    const timeSinceLastDetection = Date.now() - lastDetectionTimeRef.current;
    const isActive = detectorActiveRef.current;
    const mode = detectorModeRef.current;
    const video = videoRef.current;
    const videoReady = video?.readyState >= 2;
    console.log(
      `[Detector Status] Active=${isActive} | Mode=${mode} | VideoReady=${videoReady} | TimeSinceLast=${timeSinceLastDetection}ms`
    );
  }, []);

  const resetTracking = useCallback(() => {
    const { width, height } = getVideoFrameSize(videoRef.current);
    publishTrackingState({
      faceState: createEmptyFaceState(width, height),
      poseNeck: null,
      handLandmarks: null,
    });
  }, [publishTrackingState]);

  const handleFaceResults = useCallback((results) => {
    resetDetectorHeartbeat(); // Fix #1: Reset heartbeat
    const { width, height } = getVideoFrameSize(videoRef.current);
    const faceState = buildFaceState(results?.multiFaceLandmarks?.[0], width, height);
    updateFaceState(faceState || createEmptyFaceState(width, height));
  }, [updateFaceState, resetDetectorHeartbeat]);

  const handlePoseResults = useCallback((results) => {
    resetDetectorHeartbeat(); // Fix #1: Reset heartbeat
    const poseNeck = buildPoseNeck(
      results?.poseLandmarks,
      latestFaceStateRef.current.landmarks,
      emaDepthRef.current,
      'pose'
    );
    updatePoseNeck(poseNeck);
  }, [updatePoseNeck, resetDetectorHeartbeat]);

  const handleHolisticResults = useCallback((results) => {
    resetDetectorHeartbeat(); // Fix #1: Reset heartbeat
    const { width, height } = getVideoFrameSize(videoRef.current);
    const faceState = buildFaceState(results?.faceLandmarks?.[0], width, height)
      || createEmptyFaceState(width, height);

    const poseNeck = buildPoseNeck(
      results?.poseLandmarks?.[0],
      faceState.landmarks,
      emaDepthRef.current,
      'holistic'
    );

    // Extract hand landmarks for ring/bangle tracking
    const leftHand = results?.leftHandLandmarks?.[0];
    const rightHand = results?.rightHandLandmarks?.[0];
    const hands = [];
    if (rightHand && rightHand.length >= 21) hands.push(rightHand);
    if (leftHand && leftHand.length >= 21) hands.push(leftHand);

    publishTrackingState({
      faceState,
      poseNeck,
      handLandmarks: hands.length > 0 ? hands : null,
    });
  }, [publishTrackingState, resetDetectorHeartbeat]);

  const stopDetectionLoop = useCallback(() => {
    detectorActiveRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const teardownDetectors = useCallback(() => {
    holisticRef.current?.close?.();
    faceMeshRef.current?.close?.();
    poseRef.current?.close?.();

    holisticRef.current = null;
    faceMeshRef.current = null;
    poseRef.current = null;
    detectorModeRef.current = 'none';
  }, []);

  const detectLoop = useCallback(async () => {
    // Fix #1: Don't exit if not active - let outer logic control
    try {
      const video = videoRef.current;

      if (video && video.readyState >= 2) {
        if (detectorModeRef.current === 'holistic' && holisticRef.current) {
          try {
            const result = holisticRef.current.detectForVideo(video, performance.now());
            handleHolisticResults(result);
          } catch (detectError) {
            console.error('[WebcamCapture] Holistic detect error:', detectError);
          }
        } else {
          if (faceMeshRef.current) {
            try {
              await faceMeshRef.current.send({ image: video });
            } catch (faceError) {
              console.error('[WebcamCapture] FaceMesh send error:', faceError);
            }
          }

          if (poseRef.current) {
            try {
              await poseRef.current.send({ image: video });
            } catch (poseError) {
              console.error('[WebcamCapture] Pose send error:', poseError);
            }
          }
        }
      }
    } catch (err) {
      console.error('[WebcamCapture] Outer detectLoop error:', err);
    }

    // Fix #1: Always schedule next frame if not explicitly stopped
    if (detectorActiveRef.current) {
      animFrameRef.current = requestAnimationFrame(() => {
        detectLoop();
      });
    }
  }, [handleFaceResults, handleHolisticResults, handlePoseResults]);

  const startDetectionLoop = useCallback(() => {
    if (!animFrameRef.current && detectorActiveRef.current === false) {
      console.log('[WebcamCapture] Starting detection loop');
      detectorActiveRef.current = true;
      resetDetectorHeartbeat();
      animFrameRef.current = requestAnimationFrame(() => {
        detectLoop();
      });
    }
  }, [detectLoop, resetDetectorHeartbeat]);

  const initLegacyDetectors = useCallback(async () => {
    const [{ FaceMesh }, { Pose }] = await Promise.all([
      import('@mediapipe/face_mesh'),
      import('@mediapipe/pose'),
    ]);

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults(handleFaceResults);

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    pose.onResults(handlePoseResults);

    faceMeshRef.current = faceMesh;
    poseRef.current = pose;
    detectorModeRef.current = 'legacy';
    startDetectionLoop();
  }, [handleFaceResults, handlePoseResults, startDetectionLoop]);

  const initHolisticDetector = useCallback(async () => {
    const { FilesetResolver, HolisticLandmarker } = await import('@mediapipe/tasks-vision');

    if (!taskCanvasRef.current) {
      taskCanvasRef.current = document.createElement('canvas');
    }

    const vision = await FilesetResolver.forVisionTasks(TASKS_VISION_WASM_URL);
    const baseOptions = {
      modelAssetPath: HOLISTIC_MODEL_URL,
    };
    const options = {
      runningMode: 'VIDEO',
      minFaceDetectionConfidence: 0.55,
      minFacePresenceConfidence: 0.55,
      minFaceSuppressionThreshold: 0.3,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minPoseSuppressionThreshold: 0.3,
      minHandLandmarksConfidence: 0.4,
      outputFaceBlendshapes: false,
    };

    try {
      holisticRef.current = await HolisticLandmarker.createFromOptions(vision, {
        ...options,
        canvas: taskCanvasRef.current,
        baseOptions: {
          ...baseOptions,
          delegate: 'GPU',
        },
      });
    } catch (gpuError) {
      console.warn('Holistic GPU init failed, falling back to CPU:', gpuError);
      holisticRef.current = await HolisticLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: {
          ...baseOptions,
          delegate: 'CPU',
        },
      });
    }

    detectorModeRef.current = 'holistic';
    startDetectionLoop();
  }, [startDetectionLoop]);

  const initDetectors = useCallback(async () => {
    console.log('[WebcamCapture] Initializing detectors');
    stopDetectionLoop();
    teardownDetectors();

    try {
      await initHolisticDetector();
      console.log('[WebcamCapture] Holistic detector ready');
    } catch (holisticError) {
      console.warn('[WebcamCapture] Holistic init failed, using legacy:', holisticError);
      try {
        await initLegacyDetectors();
        console.log('[WebcamCapture] Legacy detectors ready');
      } catch (legacyError) {
        console.error('[WebcamCapture] All detector init failed:', legacyError);
        resetTracking();
        return;
      }
    }

    // Fix #1: Always start loop after init completes
    detectorActiveRef.current = true;
    startDetectionLoop();
  }, [initHolisticDetector, initLegacyDetectors, resetTracking, stopDetectionLoop, teardownDetectors, startDetectionLoop]);

  const startCamera = useCallback(async () => {
    if (startInFlightRef.current || streamRef.current) {
      return;
    }

    startInFlightRef.current = true;
    const requestId = ++cameraRequestIdRef.current;

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (requestId !== cameraRequestIdRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      setError(null);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      startRequestedRef.current = true;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current.play();
            await initDetectors();
          } catch (playError) {
            console.error('Camera playback error:', playError);
            resetTracking();
          }
        };
      }
    } catch (cameraError) {
      setError('Camera access denied. Please allow camera permissions.');
      console.error('Camera error:', cameraError);
    } finally {
      if (requestId === cameraRequestIdRef.current) {
        startInFlightRef.current = false;
      }
    }
  }, [initDetectors, resetTracking]);

  const stopCamera = useCallback(({ force = false } = {}) => {
    cameraRequestIdRef.current += 1;
    startInFlightRef.current = false;
    stopDetectionLoop();
    teardownDetectors();
    resetTracking();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    if (force) {
      startRequestedRef.current = false;
    }
  }, [resetTracking, stopDetectionLoop, teardownDetectors]);

  useImperativeHandle(ref, () => ({
    videoElement: videoRef.current,
    cameraOn: stream !== null,
    startCamera,
    stopCamera,
  }), [startCamera, stopCamera, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera({ force: true });
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopCamera();
      } else if (startRequestedRef.current && !stream) {
        startCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [startCamera, stopCamera, stream]);

  // Fix #1: Cleanup heartbeat on unmount
  useEffect(() => {
    return () => {
      if (detectorTimeoutRef.current) {
        clearTimeout(detectorTimeoutRef.current);
      }
    };
  }, []);

  // Fix #3: Monitor detector status (debug logging every 5 seconds)
  useEffect(() => {
    const statusInterval = setInterval(() => {
      logDetectorStatus();
    }, 5000);

    return () => clearInterval(statusInterval);
  }, [logDetectorStatus]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-5xl mb-4">Camera</div>
          <h3 className="text-xl font-display font-semibold mb-2">Camera Required</h3>
          <p className="text-white/40 text-sm">{error}</p>
          <button onClick={startCamera} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="max-w-full max-h-full object-contain"
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none"
        style={{
          transform: mirrored ? 'scaleX(-1)' : 'none',
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
});

WebcamCapture.displayName = 'WebcamCapture';

export default WebcamCapture;
