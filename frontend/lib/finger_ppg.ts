/**
 * Finger PPG Heart Rate Detection with Flashlight
 * Uses camera and flashlight for accurate PPG measurement
 */

interface HeartRateResult {
    hr: number;
    timestamp: number;
    method: string;
    confidence: number;
    placement_score: number;
    flashlight_used: boolean;
}

class FingerPPG {
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    stream: MediaStream | null;
    isRunning: boolean;
    samples: number[];
    timestamps: number[];
    maxSamples: number;
    onHeartRate: ((result: HeartRateResult) => void) | null;
    flashlightSupported: boolean;
    flashlightEnabled: boolean;
    placementScore: number;
    isMobile: boolean;

    constructor(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d')!;
        this.stream = null;
        this.isRunning = false;
        this.samples = [];
        this.timestamps = [];
        this.maxSamples = 300;
        this.onHeartRate = null;
        this.flashlightSupported = false;
        this.flashlightEnabled = false;
        this.placementScore = 0;
        this.isMobile = false;
    }

    async checkDeviceCapabilities(): Promise<void> {
        // Check if flashlight is available (mobile devices)
        if ('mediaDevices' in navigator && 'getSupportedConstraints' in navigator.mediaDevices) {
            const constraints = navigator.mediaDevices.getSupportedConstraints();
            this.flashlightSupported = (constraints as any).torch || false;
        }

        // Check if we're on mobile (for flashlight usage)
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    async start(): Promise<void> {
        await this.checkDeviceCapabilities();

        try {
            const constraints = {
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'environment' // Back camera for better flashlight
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            await this.video.play();

            // Enable flashlight if available
            if (this.flashlightSupported && this.isMobile) {
                await this.enableFlashlight();
            }

            this.isRunning = true;
            this.samples = [];
            this.timestamps = [];
            this.processFrame();

        } catch (error) {
            console.error('Error accessing camera:', error);
            throw error;
        }
    }

    async enableFlashlight(): Promise<void> {
        try {
            const track = this.stream!.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            if ((capabilities as any).torch) {
                await track.applyConstraints({
                    advanced: [{ torch: true } as any]
                });
                this.flashlightEnabled = true;
                console.log('Flashlight enabled');
            }
        } catch (error) {
            console.warn('Could not enable flashlight:', error);
        }
    }

    stop(): void {
        this.isRunning = false;
        if (this.flashlightEnabled) {
            this.disableFlashlight();
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    async disableFlashlight(): Promise<void> {
        try {
            const track = this.stream!.getVideoTracks()[0];
            await track.applyConstraints({
                advanced: [{ torch: false } as any]
            });
            this.flashlightEnabled = false;
        } catch (error) {
            console.warn('Could not disable flashlight:', error);
        }
    }

    processFrame() {
        if (!this.isRunning) return;

        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

        // Analyze finger placement
        this.placementScore = this.analyzePlacement();

        if (this.placementScore > 0.5) { // Good placement
            const imageData = this.ctx.getImageData(
                this.canvas.width * 0.4, this.canvas.height * 0.4,
                this.canvas.width * 0.2, this.canvas.height * 0.2
            );

            let greenSum = 0;
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                greenSum += data[i + 1];
            }
            const avgGreen = greenSum / (data.length / 4);

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
                        method: 'finger',
                        confidence: this.calculateConfidence(hr) * this.placementScore,
                        placement_score: this.placementScore,
                        flashlight_used: this.flashlightEnabled
                    });
                }
            }
        }

        requestAnimationFrame(() => this.processFrame());
    }

    analyzePlacement() {
        // Analyze if finger is properly placed over camera/flash
        const centerRegion = this.ctx.getImageData(
            this.canvas.width * 0.35, this.canvas.height * 0.35,
            this.canvas.width * 0.3, this.canvas.height * 0.3
        );

        const data = centerRegion.data;
        let darkPixels = 0;
        let totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
            if (brightness < 50) { // Dark pixel (finger blocking light)
                darkPixels++;
            }
        }

        const coverage = darkPixels / totalPixels;

        // Good placement: 60-90% coverage (finger covering but not too much)
        if (coverage >= 0.6 && coverage <= 0.9) {
            return Math.min(coverage * 1.2, 1.0); // Boost score for good coverage
        } else if (coverage >= 0.4 && coverage <= 0.95) {
            return coverage * 0.8; // Acceptable but lower score
        } else {
            return 0.1; // Poor placement
        }
    }

    calculateHeartRate() {
        if (this.samples.length < 150) return null;

        const signal = this.samples.slice(-150);
        const timestamps = this.timestamps.slice(-150);

        const mean = signal.reduce((a, b) => a + b) / signal.length;
        const detrended = signal.map(x => x - mean);

        const peaks = [];
        for (let i = 1; i < detrended.length - 1; i++) {
            if (detrended[i] > detrended[i-1] && detrended[i] > detrended[i+1] && detrended[i] > 0) {
                peaks.push(timestamps[i]);
            }
        }

        if (peaks.length < 3) return null;

        const intervals = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i-1]);
        }

        const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
        const bpm = 60000 / avgInterval;

        if (bpm >= 50 && bpm <= 180) {
            return bpm;
        }

        return null;
    }

    calculateConfidence(hr: number): number {
        if (this.samples.length < 150) return 0;

        const recent = this.samples.slice(-50);
        const variance = recent.reduce((acc, val) => acc + Math.pow(val - recent.reduce((a,b)=>a+b)/recent.length, 2), 0) / recent.length;
        const signalStrength = Math.sqrt(variance);

        const confidence = Math.min(signalStrength / 10, 1);
        return Math.max(0.1, confidence);
    }
}

export default FingerPPG;