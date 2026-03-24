import base64
import json
import logging

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from scipy.signal import butter, filtfilt, welch

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ppg")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "PPG Backend running"}

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Shared Signal Processing ──────────────

def bandpass(signal, fps, low, high):
    nyq = fps / 2
    lo = max(0.01, low / nyq)
    hi = min(0.99, high / nyq)
    if lo >= hi:
        return signal
    b, a = butter(2, [lo, hi], btype='band')
    return filtfilt(b, a, signal)


def welch_hr(signal, fps, freq_low, freq_high):
    freqs, psd = welch(signal, fs=fps, nperseg=min(len(signal), 256))
    mask = (freqs >= freq_low) & (freqs <= freq_high)
    if not mask.any():
        return None, 0
    psd_band = psd[mask]
    freqs_band = freqs[mask]
    idx = np.argmax(psd_band)
    bpm = freqs_band[idx] * 60
    conf = float(psd_band[idx] / (psd_band.sum() + 1e-6))
    return bpm, conf


# ── Face rPPG Session (CHROM) ─────────────

class RppgSession:
    WINDOW = 128
    MIN = 64

    def __init__(self):
        self.raw = {'r': [], 'g': [], 'b': []}
        self.fps = 30
        self.frame_count = 0

    def push_frame(self, img, fps):
        self.fps = fps
        self.frame_count += 1
        skin = self._skin_pixels(img)
        if skin is not None:
            self.raw['r'].append(float(skin[:, 0].mean()))
            self.raw['g'].append(float(skin[:, 1].mean()))
            self.raw['b'].append(float(skin[:, 2].mean()))
        else:
            for ch in 'rgb':
                self.raw[ch].append(self.raw[ch][-1] if self.raw[ch] else 128.0)
        for ch in 'rgb':
            if len(self.raw[ch]) > self.WINDOW * 2:
                self.raw[ch] = self.raw[ch][-self.WINDOW:]

    def compute(self):
        n = len(self.raw['g'])
        if n < self.MIN:
            return {"type": "waiting", "frames_needed": self.MIN - n}
        return self._chrom()

    def _chrom(self):
        r = np.array(self.raw['r'][-self.WINDOW:], dtype=np.float64)
        g = np.array(self.raw['g'][-self.WINDOW:], dtype=np.float64)
        b = np.array(self.raw['b'][-self.WINDOW:], dtype=np.float64)
        r /= (r.mean() + 1e-8)
        g /= (g.mean() + 1e-8)
        b /= (b.mean() + 1e-8)
        xs = 3 * r - 2 * g
        ys = 1.5 * r + g - 1.5 * b
        xs = bandpass(xs, self.fps, 0.7, 4.0)
        ys = bandpass(ys, self.fps, 0.7, 4.0)
        alpha = xs.std() / (ys.std() + 1e-6)
        signal = xs - alpha * ys
        bpm, conf = welch_hr(signal, self.fps, 0.7, 4.0)
        if bpm is None:
            return {"type": "waiting"}
        return {"type": "result", "bpm": round(bpm, 1), "confidence": round(conf, 2), "mode": "chrom"}

    def _skin_pixels(self, img):
        ycbcr = cv2.cvtColor(img, cv2.COLOR_RGB2YCrCb)
        cb, cr = ycbcr[:, :, 2], ycbcr[:, :, 1]
        mask = (cb > 77) & (cb < 127) & (cr > 133) & (cr < 173)
        pixels = img[mask]
        return pixels if len(pixels) > 10 else None


# ── Finger PPG Session (Red Channel) ──────

class FingerPPGSession:
    WINDOW = 256
    MIN = 90

    def __init__(self):
        self.red_signal = []
        self.fps = 30
        self.frame_count = 0
        self.placement_scores = []

    def push_frame(self, img, fps):
        self.fps = fps
        self.frame_count += 1

        r_mean = float(img[:, :, 0].mean())
        g_mean = float(img[:, :, 1].mean())
        b_mean = float(img[:, :, 2].mean())
        brightness = (r_mean + g_mean + b_mean) / 3

        placement = self._check_placement(r_mean, g_mean, b_mean, brightness)
        self.placement_scores.append(placement)
        if len(self.placement_scores) > 30:
            self.placement_scores = self.placement_scores[-30:]

        if placement > 0.4:
            self.red_signal.append(r_mean)
        else:
            self.red_signal.append(self.red_signal[-1] if self.red_signal else 128.0)

        if len(self.red_signal) > self.WINDOW * 2:
            self.red_signal = self.red_signal[-self.WINDOW:]

    def compute(self):
        n = len(self.red_signal)
        avg_placement = np.mean(self.placement_scores[-15:]) if self.placement_scores else 0

        if n < self.MIN:
            return {
                "type": "waiting",
                "frames_needed": self.MIN - n,
                "placement": round(avg_placement, 2),
            }

        sig = np.array(self.red_signal[-self.WINDOW:], dtype=np.float64)
        sig = sig / (sig.mean() + 1e-8)
        filtered = bandpass(sig, self.fps, 0.8, 3.0)

        bpm, conf = welch_hr(filtered, self.fps, 0.8, 3.0)

        if bpm is None or bpm < 45 or bpm > 185:
            return {"type": "waiting", "placement": round(avg_placement, 2)}

        conf = min(conf * avg_placement * 1.2, 0.99)

        return {
            "type": "result",
            "bpm": round(bpm, 1),
            "confidence": round(conf, 2),
            "placement": round(avg_placement, 2),
            "mode": "finger_ppg",
        }

    def _check_placement(self, r, g, b, brightness):
        if brightness < 10:
            return 0.3
        red_ratio = r / (r + g + b + 1e-6)
        if red_ratio > 0.45 and brightness < 180:
            return min(red_ratio * 2, 1.0)
        if brightness > 220:
            return 0.1
        if red_ratio > 0.35:
            return red_ratio * 1.5
        return 0.2


# ── WebSocket: Finger PPG (must be before catch-all) ──

@app.websocket("/ws/finger/{session_id}")
async def ws_finger(ws: WebSocket, session_id: str):
    await ws.accept()
    session = FingerPPGSession()
    log.info(f"[finger:{session_id}] connected")
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            if msg["type"] == "frame":
                img_bytes = base64.b64decode(msg["data"])
                arr = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img is None:
                    continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, (36, 36))
                session.push_frame(img, msg.get("fps", 30))
                if session.frame_count % 4 == 0:
                    result = session.compute()
                    await ws.send_text(json.dumps(result))
    except WebSocketDisconnect:
        log.info(f"[finger:{session_id}] disconnected")


# ── WebSocket: Face rPPG (catch-all) ─────────

@app.websocket("/ws/{session_id}")
async def ws_face(ws: WebSocket, session_id: str):
    await ws.accept()
    session = RppgSession()
    log.info(f"[face:{session_id}] connected")
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            if msg["type"] == "frame":
                img_bytes = base64.b64decode(msg["data"])
                arr = np.frombuffer(img_bytes, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img is None:
                    continue
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                img = cv2.resize(img, (36, 36))
                session.push_frame(img, msg.get("fps", 30))
                if session.frame_count % 8 == 0:
                    result = session.compute()
                    await ws.send_text(json.dumps(result))
    except WebSocketDisconnect:
        log.info(f"[face:{session_id}] disconnected")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
