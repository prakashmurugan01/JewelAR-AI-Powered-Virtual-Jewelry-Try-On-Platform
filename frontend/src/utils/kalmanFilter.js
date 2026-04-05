/**
 * Client-side Kalman filter v3 — Adaptive, low-latency AR tracking.
 *
 * Key improvements over v2:
 *  1. **Adaptive process noise**: Automatically increases when the user is moving
 *     (fast response) and decreases when still (jitter suppression).
 *  2. **Dead-zone filter**: Sub-pixel movements are ignored entirely — the user
 *     is still and the delta is just sensor noise.
 *  3. **Frame-rate-independent**: Process noise is scaled by dt so that behavior
 *     is consistent at 30fps, 60fps, or anything in between.
 *  4. **Soft outlier rejection**: Instead of hard-clamping, outliers are
 *     exponentially attenuated so genuine fast movements still get through.
 *  5. **Reduced velocity damping**: 0.72 (was 0.88) for snappier direction changes.
 */

export class KalmanFilter1D {
  /**
   * @param {number} processNoise   - Base system dynamics noise (default 0.008)
   * @param {number} measurementNoise - Sensor noise (default 0.10)
   */
  constructor(processNoise = 0.008, measurementNoise = 0.10) {
    this.x = 0;           // state estimate
    this.v = 0;           // velocity estimate
    this.p = 1;           // estimate covariance
    this.qBase = processNoise;
    this.q = processNoise;
    this.r = measurementNoise;
    this.initialized = false;
    this.lastMeasurement = 0;
    this.lastTimestamp = 0;
    this.outlierThreshold = 0.35;   // default for normalized signals like scale values
    this.velocityDamping = 0.72;    // was 0.88 — snappier direction changes
    this.deadZone = 0.004;          // default for normalized signals; pixel filters override this
    this.adaptiveRange = 6.0;       // max multiplier for process noise when moving fast
  }

  update(measurement) {
    const now = performance.now();

    if (!this.initialized) {
      this.x = measurement;
      this.lastMeasurement = measurement;
      this.lastTimestamp = now;
      this.initialized = true;
      return this.x;
    }

    // ── Frame-rate-independent dt ──
    const dtMs = Math.min(now - this.lastTimestamp, 100); // cap at 100ms to prevent huge jumps after tab switch
    const dtScale = Math.max(dtMs / 16.67, 0.5);         // normalized to ~60fps
    this.lastTimestamp = now;

    // ── Dead-zone: ignore sub-pixel sensor noise ──
    const rawDelta = Math.abs(measurement - this.x);
    if (rawDelta < this.deadZone) {
      // Movement is negligible — user is still, don't update
      return this.x;
    }

    // ── Adaptive process noise ──
    // Velocity magnitude drives adaptation: fast movement → high noise (responsive),
    // still → low noise (stable).
    const speed = Math.abs(this.v);
    const adaptiveFactor = 1.0 + Math.min(speed * 25, this.adaptiveRange - 1);
    this.q = this.qBase * adaptiveFactor * dtScale;

    // ── Soft outlier rejection ──
    // Instead of hard-clamp, exponentially attenuate the outlier so genuine
    // fast movements still partially get through.
    let effectiveMeasurement = measurement;
    if (rawDelta > this.outlierThreshold) {
      const excess = rawDelta - this.outlierThreshold;
      const attenuation = Math.exp(-excess * 3.0); // soft falloff
      effectiveMeasurement = this.x + Math.sign(measurement - this.x) * (this.outlierThreshold + excess * attenuation);
    }

    // ── Predict ──
    const predicted = this.x + this.v * this.velocityDamping * dtScale;
    this.p += this.q;

    // ── Update ──
    const k = this.p / (this.p + this.r);
    this.x = predicted + k * (effectiveMeasurement - predicted);
    this.p *= (1 - k);

    // ── Velocity estimation ──
    const rawVel = (measurement - this.lastMeasurement) / dtScale;
    this.v = rawVel * 0.35 + this.v * 0.65;
    this.lastMeasurement = measurement;

    return this.x;
  }

  reset() {
    this.x = 0;
    this.v = 0;
    this.p = 1;
    this.q = this.qBase;
    this.initialized = false;
    this.lastMeasurement = 0;
    this.lastTimestamp = 0;
  }
}


export class PointStabilizer {
  /**
   * Position stabilizer — adaptive noise for XY.
   * processNoise=0.008, measurementNoise=0.08 gives responsive yet stable tracking.
   */
  constructor(processNoise = 0.008, measurementNoise = 0.08) {
    this.xFilter = new KalmanFilter1D(processNoise, measurementNoise);
    this.yFilter = new KalmanFilter1D(processNoise, measurementNoise);
    this.xFilter.deadZone = 0.4;
    this.yFilter.deadZone = 0.4;
    this.xFilter.outlierThreshold = 32;
    this.yFilter.outlierThreshold = 32;
  }

  smooth(x, y) {
    return {
      x: this.xFilter.update(x),
      y: this.yFilter.update(y),
    };
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
  }
}


export class SizeStabilizer {
  /**
   * Size stabilizer — tighter base noise to prevent pulsing, but still adaptive.
   * processNoise=0.004, measurementNoise=0.15 keeps size steady at rest, responsive when zoom changes.
   */
  constructor(processNoise = 0.004, measurementNoise = 0.15) {
    this.wFilter = new KalmanFilter1D(processNoise, measurementNoise);
    this.hFilter = new KalmanFilter1D(processNoise, measurementNoise);
    // Size changes should be more resistant to jitter
    this.wFilter.deadZone = 0.8;
    this.hFilter.deadZone = 0.8;
    this.wFilter.outlierThreshold = 42;
    this.hFilter.outlierThreshold = 42;
    this.wFilter.adaptiveRange = 3.0;
    this.hFilter.adaptiveRange = 3.0;
  }

  smooth(w, h) {
    return {
      width: this.wFilter.update(w),
      height: this.hFilter.update(h),
    };
  }

  reset() {
    this.wFilter.reset();
    this.hFilter.reset();
  }
}


export class RotationStabilizer {
  /**
   * Rotation stabilizer — tight to prevent spinning but adaptive for real rotation.
   * processNoise=0.003, measurementNoise=0.18
   */
  constructor(processNoise = 0.003, measurementNoise = 0.18) {
    this.filter = new KalmanFilter1D(processNoise, measurementNoise);
    this.filter.outlierThreshold = 15; // degrees — reject sudden rotation jumps
    this.filter.deadZone = 0.3;        // ignore tiny rotation noise
    this.filter.adaptiveRange = 4.0;
  }

  smooth(angleDegrees) {
    return this.filter.update(angleDegrees);
  }

  reset() {
    this.filter.reset();
  }
}
