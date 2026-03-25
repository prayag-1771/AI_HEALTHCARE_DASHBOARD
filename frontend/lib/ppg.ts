export interface PPGFrame {
  red: number;
  green: number;
  blue: number;
  timestamp: number;
}

export interface PPGResult {
  hr: number;
  confidence: number;
  signal: number[];
  peaks: number[];
}

export function extractChannels(
  imageData: ImageData,
  roi?: { x: number; y: number; w: number; h: number }
): { red: number; green: number; blue: number } {
  const data = imageData.data;
  const width = imageData.width;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;

  const x0 = roi ? roi.x : 0;
  const y0 = roi ? roi.y : 0;
  const x1 = roi ? roi.x + roi.w : imageData.width;
  const y1 = roi ? roi.y + roi.h : imageData.height;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      count++;
    }
  }

  return {
    red: rSum / count,
    green: gSum / count,
    blue: bSum / count,
  };
}

// ── Actual FPS from timestamps ──

export function computeActualFPS(frames: PPGFrame[]): number {
  if (frames.length < 2) return 30;
  const totalMs = frames[frames.length - 1].timestamp - frames[0].timestamp;
  if (totalMs <= 0) return 30;
  const fps = ((frames.length - 1) / totalMs) * 1000;
  return Math.max(5, Math.min(60, fps));
}

// ── 2nd-order Butterworth bandpass (forward-backward for zero phase) ──

function butter2Bandpass(signal: number[], fps: number, low: number, high: number): number[] {
  const n = signal.length;
  if (n < 8) return signal;

  const mean = signal.reduce((a, b) => a + b, 0) / n;
  const centered = signal.map((v) => v - mean);

  const nyq = fps / 2;
  const wl = low / nyq;
  const wh = high / nyq;

  if (wl >= 1 || wh >= 1 || wl <= 0 || wh <= 0 || wl >= wh) return centered;

  const f1 = Math.tan(Math.PI * wl);
  const f2 = Math.tan(Math.PI * wh);
  const bw = f2 - f1;
  const f0sq = f1 * f2;

  const Q = Math.sqrt(f0sq) / bw;
  const w0 = Math.sqrt(f0sq);
  const alpha = Math.sin(2 * Math.atan(w0)) / (2 * Q);

  const cosw = (1 - w0 * w0) / (1 + w0 * w0);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const b1 = 0;
  const b2 = -alpha / a0;
  const a1 = -2 * cosw / a0;
  const a2 = (1 - alpha) / a0;

  const forward = new Array(n);
  forward[0] = centered[0] * b0;
  forward[1] = centered[1] * b0 + centered[0] * b1 - forward[0] * a1;
  for (let i = 2; i < n; i++) {
    forward[i] = b0 * centered[i] + b1 * centered[i - 1] + b2 * centered[i - 2]
      - a1 * forward[i - 1] - a2 * forward[i - 2];
  }

  const backward = new Array(n);
  backward[n - 1] = forward[n - 1] * b0;
  backward[n - 2] = forward[n - 2] * b0 + forward[n - 1] * b1 - backward[n - 1] * a1;
  for (let i = n - 3; i >= 0; i--) {
    backward[i] = b0 * forward[i] + b1 * forward[i + 1] + b2 * forward[i + 2]
      - a1 * backward[i + 1] - a2 * backward[i + 2];
  }

  return backward;
}

// ── FFT-based HR estimation (frequency domain — more robust than peak detection) ──

function fftHR(signal: number[], fps: number, freqLow: number, freqHigh: number): { hr: number; confidence: number } {
  const n = signal.length;
  if (n < 16) return { hr: 0, confidence: 0 };

  // Zero-pad to next power of 2
  let N = 1;
  while (N < n) N *= 2;
  const padded = new Array(N).fill(0);
  for (let i = 0; i < n; i++) padded[i] = signal[i];

  // DFT (real input)
  const mag = new Array(Math.floor(N / 2)).fill(0);
  for (let k = 0; k < mag.length; k++) {
    let re = 0, im = 0;
    for (let t = 0; t < N; t++) {
      const angle = (2 * Math.PI * k * t) / N;
      re += padded[t] * Math.cos(angle);
      im -= padded[t] * Math.sin(angle);
    }
    mag[k] = Math.sqrt(re * re + im * im);
  }

  // Find peak in HR frequency range
  const freqRes = fps / N;
  const kLow = Math.max(1, Math.ceil(freqLow / freqRes));
  const kHigh = Math.min(mag.length - 1, Math.floor(freqHigh / freqRes));

  if (kLow >= kHigh) return { hr: 0, confidence: 0 };

  let peakK = kLow;
  let peakMag = 0;
  let totalMag = 0;
  for (let k = kLow; k <= kHigh; k++) {
    totalMag += mag[k];
    if (mag[k] > peakMag) {
      peakMag = mag[k];
      peakK = k;
    }
  }

  // Parabolic interpolation for sub-bin accuracy
  let peakFreq = peakK * freqRes;
  if (peakK > kLow && peakK < kHigh) {
    const left = mag[peakK - 1];
    const center = mag[peakK];
    const right = mag[peakK + 1];
    const delta = 0.5 * (right - left) / (2 * center - left - right + 1e-10);
    peakFreq = (peakK + delta) * freqRes;
  }

  const bpm = peakFreq * 60;
  const conf = totalMag > 0 ? peakMag / totalMag : 0;

  if (bpm < 40 || bpm > 200) return { hr: 0, confidence: 0 };

  return { hr: Math.round(bpm), confidence: Math.round(Math.min(conf * 2, 0.95) * 100) / 100 };
}

// ── Peak detection (time domain — secondary method) ──

export function detectPeaks(signal: number[], minDistance: number): number[] {
  const peaks: number[] = [];
  if (signal.length < 3) return peaks;

  for (let i = 1; i < signal.length - 1; i++) {
    if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }

  if (peaks.length < 2) return peaks;

  const peakVals = peaks.map((i) => signal[i]);
  const avgPeak = peakVals.reduce((a, b) => a + b, 0) / peakVals.length;
  const threshold = avgPeak * 0.3;

  return peaks.filter((i) => signal[i] > threshold);
}

export function calculateHR(peaks: number[], fps: number): { hr: number; confidence: number } {
  if (peaks.length < 2) return { hr: 0, confidence: 0 };

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) / fps);
  }

  const validIntervals = intervals.filter((t) => t > 0.3 && t < 2.0);
  if (validIntervals.length === 0) return { hr: 0, confidence: 0 };

  const mean = validIntervals.reduce((a, b) => a + b, 0) / validIntervals.length;
  const hr = Math.round(60 / mean);

  const variance = validIntervals.reduce((sum, t) => sum + (t - mean) ** 2, 0) / validIntervals.length;
  const cv = Math.sqrt(variance) / mean;
  const confidence = Math.max(0, Math.min(1, 1 - cv * 2));

  if (hr < 40 || hr > 200) return { hr: 0, confidence: 0 };

  return { hr, confidence: Math.round(confidence * 100) / 100 };
}

// ── CHROM algorithm (local implementation matching backend) ──

function chromProcess(frames: PPGFrame[], fps: number): { signal: number[]; hr: number; confidence: number } {
  if (frames.length < 64) return { signal: [], hr: 0, confidence: 0 };

  const r = frames.map((f) => f.red);
  const g = frames.map((f) => f.green);
  const b = frames.map((f) => f.blue);

  // Normalize
  const rMean = r.reduce((a, v) => a + v, 0) / r.length || 1;
  const gMean = g.reduce((a, v) => a + v, 0) / g.length || 1;
  const bMean = b.reduce((a, v) => a + v, 0) / b.length || 1;

  const rn = r.map((v) => v / rMean);
  const gn = g.map((v) => v / gMean);
  const bn = b.map((v) => v / bMean);

  // CHROM: xs = 3R - 2G, ys = 1.5R + G - 1.5B
  const xs = rn.map((_, i) => 3 * rn[i] - 2 * gn[i]);
  const ys = rn.map((_, i) => 1.5 * rn[i] + gn[i] - 1.5 * bn[i]);

  // Bandpass both
  const xsFilt = butter2Bandpass(xs, fps, 0.7, 4.0);
  const ysFilt = butter2Bandpass(ys, fps, 0.7, 4.0);

  // Alpha = std(xs) / std(ys)
  const xsStd = Math.sqrt(xsFilt.reduce((s, v) => s + v * v, 0) / xsFilt.length) || 1e-6;
  const ysStd = Math.sqrt(ysFilt.reduce((s, v) => s + v * v, 0) / ysFilt.length) || 1e-6;
  const alpha = xsStd / ysStd;

  // signal = xs - alpha * ys
  const signal = xsFilt.map((v, i) => v - alpha * ysFilt[i]);

  // FFT-based HR (primary)
  const fftResult = fftHR(signal, fps, 0.7, 4.0);

  // Peak-based HR (secondary)
  const minDist = Math.floor(fps * 0.3);
  const peaks = detectPeaks(signal, minDist);
  const peakResult = calculateHR(peaks, fps);

  // Use FFT result if available (more robust), fallback to peaks
  let hr = fftResult.hr;
  let confidence = fftResult.confidence;

  if (hr === 0 && peakResult.hr > 0) {
    hr = peakResult.hr;
    confidence = peakResult.confidence * 0.8;
  } else if (hr > 0 && peakResult.hr > 0) {
    // If both agree (within 15%), boost confidence
    if (Math.abs(hr - peakResult.hr) < hr * 0.15) {
      confidence = Math.min(0.95, confidence * 1.2);
    }
  }

  return { signal, hr, confidence };
}

// ── Finger PPG Processing ──

export function processFingerPPG(frames: PPGFrame[], _fps?: number): PPGResult {
  const fps = computeActualFPS(frames);
  if (frames.length < Math.max(fps * 2, 30)) return { hr: 0, confidence: 0, signal: [], peaks: [] };

  const rawSignal = frames.map((f) => f.red);
  const filtered = butter2Bandpass(rawSignal, fps, 0.8, 3.5);

  // FFT-based (primary)
  const fftResult = fftHR(filtered, fps, 0.8, 3.5);

  // Peak-based (secondary)
  const minDist = Math.floor(fps * 0.35);
  const peaks = detectPeaks(filtered, minDist);
  const peakResult = calculateHR(peaks, fps);

  let hr = fftResult.hr;
  let confidence = fftResult.confidence;

  if (hr === 0 && peakResult.hr > 0) {
    hr = peakResult.hr;
    confidence = peakResult.confidence;
  } else if (hr > 0 && peakResult.hr > 0 && Math.abs(hr - peakResult.hr) < hr * 0.15) {
    confidence = Math.min(0.95, confidence * 1.2);
  }

  return { hr, confidence, signal: filtered, peaks };
}

// ── Face rPPG Processing (CHROM + FFT) ──

export function processFaceRPPG(frames: PPGFrame[], _fps?: number): PPGResult {
  const fps = computeActualFPS(frames);
  if (frames.length < Math.max(fps * 3, 45)) return { hr: 0, confidence: 0, signal: [], peaks: [] };

  // CHROM approach (uses R, G, B channels)
  const chrom = chromProcess(frames, fps);

  // Also try simple green channel as fallback
  if (chrom.hr === 0) {
    const greenSignal = frames.map((f) => f.green);
    const filtered = butter2Bandpass(greenSignal, fps, 0.7, 4.0);
    const fftResult = fftHR(filtered, fps, 0.7, 4.0);
    if (fftResult.hr > 0) {
      return {
        hr: fftResult.hr,
        confidence: Math.round(fftResult.confidence * 0.7 * 100) / 100,
        signal: filtered,
        peaks: [],
      };
    }
  }

  return {
    hr: chrom.hr,
    confidence: Math.round(chrom.confidence * 0.85 * 100) / 100,
    signal: chrom.signal,
    peaks: [],
  };
}

// ── Bandpass filter (legacy export — kept for backwards compat) ──

export function bandpassFilter(signal: number[], low: number, high: number, fps: number): number[] {
  return butter2Bandpass(signal, fps, low, high);
}

// ── Finger placement detection ──

export function isFingerCovering(imageData: ImageData): { covered: boolean; quality: number } {
  const data = imageData.data;
  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  let darkPixels = 0;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rSum += r;
    gSum += g;
    bSum += b;
    count++;
    if (r < 50 && g < 50 && b < 50) darkPixels++;
  }

  const avgR = rSum / count;
  const avgG = gSum / count;
  const avgB = bSum / count;

  const isRedDominant = avgR > 80 && avgR > avgG * 1.3 && avgR > avgB * 1.5;
  const isDark = avgR < 60 && avgG < 60 && avgB < 60;
  const covered = isRedDominant || (isDark && darkPixels / count > 0.7);

  let quality = 0;
  if (covered) {
    const redRatio = avgR / (avgR + avgG + avgB + 1);
    quality = Math.min(1, redRatio * 2.5);
  }

  return { covered, quality: Math.round(quality * 100) / 100 };
}

// ── Result fusion ──

export function fuseResults(
  finger: PPGResult | null,
  face: PPGResult | null,
  fingerWeight: number = 0.7,
  faceWeight: number = 0.3
): { hr: number; confidence: number; source: string } {
  const hasF = finger && finger.hr > 0 && finger.confidence > 0.15;
  const hasR = face && face.hr > 0 && face.confidence > 0.15;

  if (hasF && hasR) {
    const fConf = finger!.confidence;
    const rConf = face!.confidence;
    const totalConf = fConf * fingerWeight + rConf * faceWeight;
    const wF = (fConf * fingerWeight) / totalConf;
    const wR = (rConf * faceWeight) / totalConf;
    const hr = Math.round(finger!.hr * wF + face!.hr * wR);
    const confidence = Math.round(Math.min(totalConf * 1.1, 0.99) * 100) / 100;
    return { hr, confidence, source: "fusion" };
  }

  if (hasF) {
    return { hr: finger!.hr, confidence: finger!.confidence, source: "finger" };
  }

  if (hasR) {
    return { hr: face!.hr, confidence: Math.round(face!.confidence * 100) / 100, source: "face" };
  }

  return { hr: 0, confidence: 0, source: "none" };
}
