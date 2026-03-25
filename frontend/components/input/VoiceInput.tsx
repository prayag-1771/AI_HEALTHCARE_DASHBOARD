"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import {
  Mic, MicOff, Camera, ChevronRight, Loader2, Square,
  Heart, Brain, Thermometer, Moon, AlertTriangle,
  CheckCircle2, XCircle, SkipForward,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { VoiceAnalysis } from "@/lib/types";

interface VoiceInputProps {
  onComplete: (analysis: VoiceAnalysis) => void;
}

interface QuestionDef {
  id: string;
  text: string;
  icon: typeof Heart;
  color: string;
  keywords: Record<string, string[]>;
}

const QUESTIONS: QuestionDef[] = [
  {
    id: "mood",
    text: "How are you feeling right now?",
    icon: Heart,
    color: "text-rose-400",
    keywords: {
      positive: ["good", "great", "fine", "happy", "wonderful", "amazing", "excellent", "better", "okay", "alright", "energetic", "refreshed"],
      negative: ["bad", "terrible", "awful", "horrible", "worse", "not good", "not well", "sick", "weak", "low", "down", "sad", "depressed"],
      stress: ["stressed", "anxious", "worried", "nervous", "tense", "overwhelmed", "panicked", "restless", "uneasy"],
    },
  },
  {
    id: "pain",
    text: "Are you experiencing any pain or discomfort?",
    icon: AlertTriangle,
    color: "text-amber-400",
    keywords: {
      pain: ["pain", "hurt", "ache", "sore", "sharp", "dull", "throbbing", "burning", "stinging", "cramp", "stiff"],
      location: ["head", "chest", "back", "stomach", "throat", "joint", "muscle", "neck", "shoulder", "knee", "leg", "arm"],
      none: ["no", "none", "nothing", "fine", "no pain", "comfortable"],
    },
  },
  {
    id: "stress",
    text: "How would you rate your stress level today?",
    icon: Brain,
    color: "text-violet-400",
    keywords: {
      high: ["very", "extremely", "high", "a lot", "too much", "overwhelming", "intense", "severe", "maximum", "10", "9", "8"],
      moderate: ["moderate", "medium", "somewhat", "a bit", "little", "manageable", "5", "6", "7"],
      low: ["low", "minimal", "none", "relaxed", "calm", "peaceful", "zen", "chill", "1", "2", "3", "4", "no stress"],
    },
  },
  {
    id: "sleep",
    text: "How well did you sleep last night?",
    icon: Moon,
    color: "text-blue-400",
    keywords: {
      good: ["well", "great", "good", "excellent", "perfectly", "deep", "soundly", "enough", "8 hours", "7 hours", "refreshed"],
      poor: ["poorly", "bad", "terrible", "barely", "couldn't", "insomnia", "restless", "tossing", "woke up", "nightmare", "2 hours", "3 hours", "4 hours"],
      moderate: ["okay", "alright", "so-so", "average", "not great", "could be better", "5 hours", "6 hours"],
    },
  },
  {
    id: "symptoms",
    text: "Do you have any symptoms like headache, fever, cough, or nausea?",
    icon: Thermometer,
    color: "text-emerald-400",
    keywords: {
      symptoms: ["headache", "fever", "cough", "nausea", "dizzy", "dizziness", "fatigue", "tired", "breathless", "shortness", "vomit", "chills", "sweating", "congestion", "runny nose", "sneezing", "body ache"],
      none: ["no", "none", "nothing", "no symptoms", "all good", "healthy"],
    },
  },
];

type Phase = "idle" | "listening" | "processing" | "done" | "error";

export default function VoiceInput({ onComplete }: VoiceInputProps) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentQ, setCurrentQ] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [answers, setAnswers] = useState<{ question: string; transcript: string; keywords: string[] }[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [expressionData, setExpressionData] = useState<number[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [streamReady, setStreamReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const displayVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const prevFrameRef = useRef<Float32Array | null>(null);
  const movementScores = useRef<number[]>([]);
  const brightnessScores = useRef<number[]>([]);
  const colorVariance = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRafRef = useRef<number>(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const keepListeningRef = useRef(true);

  const stopAll = useCallback(() => {
    keepListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    if (audioRafRef.current) { cancelAnimationFrame(audioRafRef.current); audioRafRef.current = 0; }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
    setStreamReady(false);
  }, []);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  // Attach stream to visible display video whenever it becomes ready
  useEffect(() => {
    if (streamReady && displayVideoRef.current && streamRef.current) {
      displayVideoRef.current.srcObject = streamRef.current;
      displayVideoRef.current.play().catch(() => {});
    }
  }, [streamReady, phase, currentQ]);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, { scale: 0.95, opacity: 0.8 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out", clearProps: "all" });
  }, [currentQ]);

  const startCamera = async () => {
    try {
      // Video ONLY — audio requested separately to avoid conflicting with SpeechRecognition
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamReady(true);
      startExpressionTracking();
    } catch {
      setPhase("error");
      setErrorMsg("Could not access camera.");
    }
  };

  // Start audio level meter from a separate mic stream (called AFTER SpeechRecognition starts)
  const startAudioMeter = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitorAudio = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(avg / 80, 1));
        audioRafRef.current = requestAnimationFrame(monitorAudio);
      };
      audioRafRef.current = requestAnimationFrame(monitorAudio);
    } catch {}
  };

  const startExpressionTracking = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = 160;
    canvas.height = 120;

    const loop = () => {
      if (!streamRef.current) return;
      ctx.drawImage(video, 0, 0, 160, 120);

      const faceX = 40, faceY = 15, faceW = 80, faceH = 90;
      const imgData = ctx.getImageData(faceX, faceY, faceW, faceH);
      const data = imgData.data;
      const pixels = data.length / 4;

      let rSum = 0, gSum = 0, bSum = 0;
      const current = new Float32Array(pixels);
      for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        rSum += r; gSum += g; bSum += b;
        current[idx] = (r + g + b) / 3;
      }

      const avgR = rSum / pixels, avgG = gSum / pixels, avgB = bSum / pixels;
      const brightness = (avgR + avgG + avgB) / 3;
      brightnessScores.current.push(brightness);

      const rVar = avgR - avgG;
      colorVariance.current.push(Math.abs(rVar));

      if (prevFrameRef.current && prevFrameRef.current.length === current.length) {
        let diff = 0;
        for (let i = 0; i < current.length; i++) {
          diff += Math.abs(current[i] - prevFrameRef.current[i]);
        }
        const movement = diff / current.length;
        movementScores.current.push(movement);
      }
      prevFrameRef.current = current;

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPhase("error");
      setErrorMsg("Speech recognition not supported. Use Chrome or Edge.");
      return;
    }

    keepListeningRef.current = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      setTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setPhase("error");
        setErrorMsg("Microphone permission denied. Please allow microphone access.");
        keepListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      if (keepListeningRef.current) {
        try { recognition.start(); } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    keepListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleStart = async () => {
    setPhase("listening");
    setCurrentQ(0);
    setAnswers([]);
    setTranscript("");
    movementScores.current = [];
    brightnessScores.current = [];
    colorVariance.current = [];
    prevFrameRef.current = null;

    await startCamera();
    // SpeechRecognition MUST start before audio meter to avoid mic conflict
    startListening();
    // Small delay then start audio level meter separately
    setTimeout(() => startAudioMeter(), 500);
  };

  const saveCurrentAnswer = () => {
    const q = QUESTIONS[currentQ];
    const text = transcript.toLowerCase();
    const found: string[] = [];

    for (const [category, words] of Object.entries(q.keywords)) {
      for (const w of words) {
        if (text.includes(w)) {
          found.push(`${category}:${w}`);
        }
      }
    }

    return { question: q.text, transcript: transcript.trim() || "(no response)", keywords: found };
  };

  const handleNext = () => {
    const answer = saveCurrentAnswer();
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
      setTranscript("");
      stopListening();
      setTimeout(() => startListening(), 300);
    } else {
      stopListening();
      setPhase("processing");
      setTimeout(() => processResults(newAnswers), 800);
    }
  };

  const handleSkip = () => {
    const newAnswers = [...answers, { question: QUESTIONS[currentQ].text, transcript: "(skipped)", keywords: [] }];
    setAnswers(newAnswers);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
      setTranscript("");
      stopListening();
      setTimeout(() => startListening(), 300);
    } else {
      stopListening();
      setPhase("processing");
      setTimeout(() => processResults(newAnswers), 800);
    }
  };

  const handleStopAll = () => {
    // Save whatever we have and finish early
    const answer = saveCurrentAnswer();
    const allAnswers = [...answers, answer];
    // Pad remaining questions as skipped
    for (let i = currentQ + 1; i < QUESTIONS.length; i++) {
      allAnswers.push({ question: QUESTIONS[i].text, transcript: "(skipped)", keywords: [] });
    }
    stopListening();
    setPhase("processing");
    setTimeout(() => processResults(allAnswers), 800);
  };

  const processResults = (allAnswers: typeof answers) => {
    const movement = movementScores.current;
    const brightness = brightnessScores.current;
    const variance = colorVariance.current;

    const avgMovement = movement.length > 0 ? movement.reduce((a, b) => a + b, 0) / movement.length : 0;
    const avgBrightness = brightness.length > 0 ? brightness.reduce((a, b) => a + b, 0) / brightness.length : 100;
    const avgVariance = variance.length > 0 ? variance.reduce((a, b) => a + b, 0) / variance.length : 0;

    const movementNorm = Math.min(avgMovement / 15, 1);
    const stressFromFace = Math.min((avgVariance / 20 + movementNorm) / 2, 1);

    let dominant: "calm" | "tense" | "distressed" | "neutral" = "neutral";
    if (stressFromFace > 0.6) dominant = "distressed";
    else if (stressFromFace > 0.35) dominant = "tense";
    else if (stressFromFace < 0.2) dominant = "calm";

    const allKeywords = allAnswers.flatMap((a) => a.keywords);

    const negativeWords = allKeywords.filter((k) => k.startsWith("negative:") || k.startsWith("pain:") || k.startsWith("high:") || k.startsWith("poor:") || k.startsWith("symptoms:"));
    const positiveWords = allKeywords.filter((k) => k.startsWith("positive:") || k.startsWith("low:") || k.startsWith("good:") || k.startsWith("none:"));

    let mood: "positive" | "neutral" | "negative" = "neutral";
    if (positiveWords.length > negativeWords.length + 2) mood = "positive";
    else if (negativeWords.length > positiveWords.length) mood = "negative";

    const painDetected = allKeywords.some((k) => k.startsWith("pain:"));

    const symptoms = allKeywords
      .filter((k) => k.startsWith("symptoms:"))
      .map((k) => k.split(":")[1]);

    let stressLevel = 0.3;
    const stressQ = allAnswers.find((a) => a.question.includes("stress"));
    if (stressQ) {
      const sk = stressQ.keywords;
      if (sk.some((k) => k.startsWith("high:"))) stressLevel = 0.8;
      else if (sk.some((k) => k.startsWith("moderate:"))) stressLevel = 0.5;
      else if (sk.some((k) => k.startsWith("low:"))) stressLevel = 0.2;
    }
    stressLevel = (stressLevel + stressFromFace) / 2;

    const voiceSentiment = mood === "negative" || stressLevel > 0.6 ? "stress" : "normal";
    const emotion = stressFromFace > 0.5 || dominant === "distressed" ? "stress" : "normal";

    const analysis: VoiceAnalysis = {
      answers: allAnswers,
      mood,
      stress_level: Math.round(stressLevel * 100) / 100,
      pain_detected: painDetected,
      symptoms: [...new Set(symptoms)],
      expression: {
        movement_score: Math.round(movementNorm * 100) / 100,
        avg_brightness: Math.round(avgBrightness),
        stress_indicator: Math.round(stressFromFace * 100) / 100,
        dominant,
      },
      voice_sentiment: voiceSentiment,
      emotion,
    };

    stopAll();
    setPhase("done");

    setExpressionData([
      analysis.stress_level,
      analysis.expression.movement_score,
      analysis.expression.stress_indicator,
    ]);

    setTimeout(() => onComplete(analysis), 1500);
  };

  const q = QUESTIONS[currentQ];
  const Icon = q?.icon || Heart;

  return (
    <div ref={containerRef} className={cn("rounded-2xl border p-6", colors.cardBorder, colors.cardBg)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className={cn("h-4 w-4", colors.accent)} />
          <span className={cn("text-sm font-medium", colors.textPrimary)}>Voice + Expression Analysis</span>
        </div>
        {phase === "listening" && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-1">
            <Camera className="h-2.5 w-2.5" />
            Tracking
          </span>
        )}
      </div>

      {phase === "idle" && (
        <div className="text-center py-4">
          <div className={cn("flex h-20 w-20 items-center justify-center rounded-full mx-auto mb-3", colors.surface)}>
            <Mic className={cn("h-10 w-10", colors.textFaint)} />
          </div>
          <p className={cn("text-xs mb-1", colors.textSecondary)}>Answer 5 health questions using your voice</p>
          <p className={cn("text-[10px]", colors.textFaint)}>Your face will be tracked for expression analysis</p>
          <button
            onClick={handleStart}
            className={cn("mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-white transition-all bg-gradient-to-r hover:opacity-90", colors.gradientFrom, colors.gradientTo)}
          >
            Start Assessment
          </button>
        </div>
      )}

      {phase === "listening" && (
        <div>
          {/* Camera preview — full width */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3">
            <video
              ref={displayVideoRef}
              className="w-full h-full object-cover mirror"
              playsInline muted autoPlay
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute top-2 left-2">
              <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-white font-medium">Expression tracking</span>
              </div>
            </div>
            <div className="absolute top-2 right-2">
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
                isListening ? "bg-red-500/80 text-white" : "bg-zinc-700/80 text-zinc-300"
              )}>
                {isListening ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5" />}
                {isListening ? "Recording" : "Paused"}
              </div>
            </div>

            {/* Audio level bars overlaid on bottom of video */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 pt-6 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-end gap-[2px] h-6">
                {Array.from({ length: 32 }).map((_, i) => {
                  const threshold = i / 32;
                  const active = audioLevel > threshold;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-[1px] transition-all duration-75",
                        active ? "bg-emerald-400" : "bg-white/20"
                      )}
                      style={{ height: active ? `${30 + (audioLevel - threshold) * 200}%` : "15%" }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question card */}
          <div className={cn("rounded-xl border p-3 mb-3", colors.surface, colors.cardBorder)}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("h-4 w-4", q.color)} />
              <span className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textMuted)}>
                Question {currentQ + 1} of {QUESTIONS.length}
              </span>
              <div className="flex gap-1 ml-auto">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className={cn(
                    "h-1.5 rounded-full transition-all",
                    i < currentQ ? "w-4 bg-emerald-500" : i === currentQ ? "w-6 bg-amber-500" : "w-3 " + colors.surface
                  )} />
                ))}
              </div>
            </div>
            <p className={cn("text-sm font-medium leading-snug", colors.textPrimary)}>{q.text}</p>
          </div>

          {/* Live transcript */}
          <div className={cn("rounded-xl border p-3 mb-3", colors.surface, colors.cardBorder)}>
            <div className="flex items-center justify-between mb-1.5">
              <p className={cn("text-[10px] font-medium uppercase tracking-wider", colors.textFaint)}>Your response</p>
              {audioLevel > 0.05 && (
                <span className="text-[9px] text-emerald-400 font-medium">Hearing you...</span>
              )}
            </div>
            <div className="min-h-[48px]">
              <p className={cn("text-sm leading-relaxed", transcript ? colors.textPrimary : colors.textFaint)}>
                {transcript || "Speak your answer..."}
              </p>
            </div>
          </div>

          {/* Previously answered questions */}
          {answers.length > 0 && (
            <div className={cn("rounded-xl border p-2.5 mb-3", colors.surface, colors.cardBorder)}>
              <p className={cn("text-[9px] font-medium uppercase tracking-wider mb-1.5", colors.textFaint)}>Previous answers</p>
              <div className="space-y-1.5">
                {answers.map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[10px] font-medium", colors.textMuted)}>Q{i + 1}: </span>
                      <span className={cn("text-[10px]", a.transcript === "(skipped)" ? colors.textFaint : colors.textSecondary)}>
                        {a.transcript}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleStopAll}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
              )}
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
            <button
              onClick={handleSkip}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all border",
                colors.cardBorder, colors.textMuted, colors.surfaceHover
              )}
            >
              <SkipForward className="h-3 w-3" />
              Skip
            </button>
            <button
              onClick={handleNext}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-all",
                transcript.length > 2
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  : cn(colors.surface, colors.textMuted, "border", colors.cardBorder)
              )}
            >
              {currentQ < QUESTIONS.length - 1 ? "Next Question" : "Finish Assessment"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div className="text-center py-8">
          <Loader2 className={cn("h-8 w-8 mx-auto mb-2 animate-spin", colors.accent)} />
          <p className={cn("text-xs", colors.textMuted)}>Analyzing voice responses and expressions...</p>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto mb-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <p className={cn("text-sm font-medium mb-2", colors.textPrimary)}>Assessment Complete</p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className={cn("rounded-lg p-2 text-center", colors.surface)}>
              <p className={cn("text-[10px]", colors.textMuted)}>Stress</p>
              <p className={cn("text-sm font-bold", expressionData[0] > 0.5 ? "text-red-400" : "text-emerald-400")}>
                {Math.round((expressionData[0] || 0) * 100)}%
              </p>
            </div>
            <div className={cn("rounded-lg p-2 text-center", colors.surface)}>
              <p className={cn("text-[10px]", colors.textMuted)}>Movement</p>
              <p className={cn("text-sm font-bold", expressionData[1] > 0.5 ? "text-amber-400" : "text-emerald-400")}>
                {Math.round((expressionData[1] || 0) * 100)}%
              </p>
            </div>
            <div className={cn("rounded-lg p-2 text-center", colors.surface)}>
              <p className={cn("text-[10px]", colors.textMuted)}>Face Stress</p>
              <p className={cn("text-sm font-bold", expressionData[2] > 0.5 ? "text-red-400" : "text-emerald-400")}>
                {Math.round((expressionData[2] || 0) * 100)}%
              </p>
            </div>
          </div>

          <div className={cn("text-[10px] space-y-1.5 text-left", colors.textFaint)}>
            {answers.map((a, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className={cn("font-medium", colors.textMuted)}>Q{i + 1}: </span>
                  <span className={a.transcript === "(skipped)" ? colors.textFaint : colors.textSecondary}>
                    {a.transcript}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="text-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mx-auto mb-3">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className={cn("text-xs", "text-red-400")}>{errorMsg}</p>
          <button
            onClick={() => setPhase("idle")}
            className={cn("mt-3 rounded-xl px-4 py-2 text-xs font-medium border", colors.cardBorder, colors.textMuted)}
          >
            Try Again
          </button>
        </div>
      )}

      <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
