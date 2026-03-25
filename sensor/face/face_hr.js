/**
 * Face-based Heart Rate Detection
 * Uses facial skin color changes for remote PPG (rPPG)
 */

class FaceHR {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.stream = null;
        this.isRunning = false;
        this.samples = [];
        this.timestamps = [];
        this.maxSamples = 300;
        this.onHeartRate = null;
        this.faceDetected = false;
        this._lastSkinRatio = 0; // track for confidence scoring
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                }
            });

            this.video.srcObject = this.stream;
            await this.video.play();

            this.isRunning = true;
            this.samples = [];
            this.timestamps = [];
            this.faceDetected = false;      // FIX #6: reset on every start
            this._lastSkinRatio = 0;
            this.processFrame();

        } catch (error) {
            console.error('Error accessing camera:', error);
            throw error;
        }
    }

    stop() {
        this.isRunning = false;
        this.faceDetected = false;          // FIX #6: reset on stop
        this._lastSkinRatio = 0;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    processFrame() {
        if (!this.isRunning) return;

        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        const faceRegion = this.detectFace();
        if (faceRegion) {
            this.faceDetected = true;
            const imageData = this.ctx.getImageData(
                faceRegion.x, faceRegion.y, faceRegion.width, faceRegion.height
            );

            // FIX #3: track skinCount separately so the average is over
            //         skin pixels only, not over the entire region
            let greenSum = 0;
            let skinCount = 0;
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (r > 60 && g > 40 && b > 20 && r > g && r > b) {
                    greenSum += g;
                    skinCount++;
                }
            }

            if (skinCount > 0) {
                const avgGreen = greenSum / skinCount; // FIX #3 applied here
                this.samples.push(avgGreen);
                this.timestamps.push(Date.now());

                if (this.samples.length > this.maxSamples) {
                    this.samples.shift();
                    this.timestamps.shift();
                }

                if (this.samples.length >= 150) {
                    const hr = this.calculateHeartRate();
                    if (hr && this.onHeartRate) {
                        this.onHeartRate({
                            hr: Math.round(hr),
                            timestamp: Date.now(),
                            method: 'face',
                            confidence: this.calculateConfidence(hr)
                        });
                    }
                }
            }
        } else {
            this.faceDetected = false;
        }

        requestAnimationFrame(() => this.processFrame());
    }

    detectFace() {
        const centerX = this.canvas.width * 0.3;
        const centerY = this.canvas.height * 0.2;
        const width   = this.canvas.width  * 0.4;
        const height  = this.canvas.height * 0.6;

        const imageData = this.ctx.getImageData(centerX, centerY, width, height);
        const data = imageData.data;
        let skinPixels = 0;
        const totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            if (r > 60 && g > 40 && b > 20 && r > g && r > b) {
                skinPixels++;
            }
        }

        const skinRatio = skinPixels / totalPixels;
        this._lastSkinRatio = skinRatio; // FIX #5: expose for confidence scoring

        if (skinRatio > 0.3) {
            return { x: centerX, y: centerY, width, height };
        }

        return null;
    }

    calculateHeartRate() {
        if (this.samples.length < 150) return null;

        const signal     = this.samples.slice(-150);
        const timestamps = this.timestamps.slice(-150);

        // Detrend
        const mean      = signal.reduce((a, b) => a + b) / signal.length;
        const detrended = signal.map(x => x - mean);

        // FIX #1: use standard deviation as the peak threshold, not mean * 0.1
        //         (after detrending, mean ≈ 0 so the old threshold was useless)
        const std = Math.sqrt(
            detrended.reduce((acc, v) => acc + v * v, 0) / detrended.length
        );

        const peaks = [];
        for (let i = 1; i < detrended.length - 1; i++) {
            if (
                detrended[i] > detrended[i - 1] &&
                detrended[i] > detrended[i + 1] &&
                detrended[i] > std * 0.3          // FIX #1: meaningful threshold
            ) {
                peaks.push(timestamps[i]);
            }
        }

        if (peaks.length < 3) return null;

        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }

        // FIX #2: filter implausible intervals BEFORE averaging
        //         (300 ms ≈ 200 bpm upper cap, 1500 ms ≈ 40 bpm lower cap)
        const validIntervals = intervals.filter(iv => iv > 300 && iv < 1500);
        if (validIntervals.length < 2) return null;

        const avgInterval = validIntervals.reduce((a, b) => a + b) / validIntervals.length;
        const bpm = 60000 / avgInterval;

        // Secondary physiological guard (redundant but cheap)
        if (bpm >= 40 && bpm <= 200) {
            return bpm;
        }

        return null;
    }

    calculateConfidence(hr) {
        if (this.samples.length < 150) return 0;

        const recent = this.samples.slice(-50);
        const recentMean = recent.reduce((a, b) => a + b) / recent.length;
        const variance = recent.reduce(
            (acc, val) => acc + Math.pow(val - recentMean, 2), 0
        ) / recent.length;
        const signalStrength = Math.sqrt(variance);

        // Base signal quality (face signals are weaker than finger, hence / 5)
        let confidence = Math.min(signalStrength / 5, 1);

        // Penalise if face is not clearly detected
        confidence *= this.faceDetected ? 1 : 0.5;

        // FIX #5: also factor in how much of the region is actually skin
        //         A face half out of frame should score lower than a centred face
        const skinQuality = Math.min(this._lastSkinRatio / 0.6, 1); // 0.6 = "full face"
        confidence *= (0.5 + 0.5 * skinQuality);

        return Math.max(0.1, Math.min(confidence, 1));
    }
}

export default FaceHR;