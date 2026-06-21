import { useState, useRef, useCallback } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { useLogState } from "@/hooks/use-log-state";
import { getGetActivitySummaryQueryKey, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, RotateCcw, Leaf, ChevronRight, UploadCloud, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { useTranslation } from "react-i18next";
import CountUp from "react-countup";

type Stage = "idle" | "preview" | "analyzing" | "result" | "confirming" | "done" | "error";

interface DetectedActivity {
  category: string;
  activityType: string;
  value: number;
  unit: string;
  co2Amount: number;
}

interface VisionResult {
  needsConfirmation: boolean;
  unrecognized?: boolean;
  autoLogged?: boolean;
  confidence: number;
  description: string;
  detected?: DetectedActivity;
}

const CATEGORY_EMOJI: Record<string, string> = {
  transport: "🚗",
  food: "🍽️",
  energy: "⚡",
  shopping: "🛍️",
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--eco-primary)]"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ children, side = "left", avatar }: { children: React.ReactNode; side?: "left" | "right"; avatar?: string | React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex gap-2.5 max-w-[85%] items-end",
        side === "left" ? "self-start" : "self-end flex-row-reverse"
      )}
    >
      {side === "left" && (
        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-xs shrink-0 select-none shadow-sm">
          {avatar || "🤖"}
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-xs shadow-sm leading-relaxed",
          side === "left"
            ? "bg-[var(--bg-glass)] border border-border/80 text-foreground rounded-bl-sm backdrop-blur-md"
            : "bg-gradient-to-tr from-emerald-500 to-[var(--eco-primary)] text-white border border-emerald-500/10 rounded-br-sm font-medium shadow-md"
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}

const HINTS = [
  { key: "hintBus", defaultVal: "Bus ticket" },
  { key: "hintFood", defaultVal: "Food plate" },
  { key: "hintMeter", defaultVal: "Electricity meter" },
  { key: "hintReceipt", defaultVal: "Shopping receipt" },
  { key: "hintVehicle", defaultVal: "Car / vehicle" },
];

export default function VisionUpload() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setHasLogged] = useLogState();

  const [stage, setStage] = useState<Stage>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [result, setResult] = useState<VisionResult | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const reset = useCallback(() => {
    setStage("idle");
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setEditValue("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback((file: File) => {
    const mime = file.type || "image/jpeg";
    setMimeType(mime);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64 ?? null);
      setStage("preview");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const analyse = async () => {
    if (!sessionId || !imageBase64) return;
    setStage("analyzing");
    try {
      const res = await fetch("/api/vision-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, imageBase64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ needsConfirmation: false, confidence: 0, description: data.error ?? "Analysis failed" });
        setStage("error");
        return;
      }
      setResult(data as VisionResult);
      if (data.unrecognized) {
        setStage("error");
      } else if (data.autoLogged) {
        invalidateQueries();
        setHasLogged(true);
        setStage("done");
      } else {
        setEditValue(String(data.detected?.value ?? 1));
        setStage("result");
      }
    } catch {
      setResult({ needsConfirmation: false, confidence: 0, description: "Connection error — please try again." });
      setStage("error");
    }
  };

  const confirmLog = async () => {
    if (!sessionId || !result?.detected) return;
    setStage("confirming");
    try {
      const res = await fetch("/api/vision-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          category: result.detected.category,
          activityType: result.detected.activityType,
          value: parseFloat(editValue) || result.detected.value,
          confidence: result.confidence,
          description: result.description,
        }),
      });
      if (!res.ok) {
        toast({ title: t("logActivity.error"), description: "Failed to log activity", variant: "destructive" });
        setStage("result");
        return;
      }
      invalidateQueries();
      setHasLogged(true);
      setStage("done");
    } catch {
      toast({ title: t("logActivity.error"), description: "Connection error", variant: "destructive" });
      setStage("result");
    }
  };

  const invalidateQueries = () => {
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId }) });
      queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) });
    }
  };

  const getActivityLabel = (category: string, activityType: string) => {
    const types = ACTIVITY_TYPES[category as keyof typeof ACTIVITY_TYPES] ?? [];
    const defaultLabel = types.find((t) => t.id === activityType)?.label ?? activityType;
    return t(`activityTypes.${activityType}`, defaultLabel);
  };

  const finalCo2 = result?.detected
    ? (parseFloat(editValue) || result.detected.value) *
      (result.detected.co2Amount / (result.detected.value || 1))
    : 0;

  return (
    <div className="saas-container max-w-md space-y-6">
      {/* Inline Scanning Laser Style */}
      <style>{`
        @keyframes scan-laser {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--eco-primary)]/10 dark:bg-[var(--eco-primary)]/20 flex items-center justify-center border border-[var(--eco-primary)]/20 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
          <Camera className="h-5 w-5 text-[var(--eco-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
            {t("visionUpload.title")}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">{t("visionUpload.desc")}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── IDLE: upload zone ── */}
        {stage === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div
              className="border-2 border-dashed border-[#22C55E] rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-[#16A34A] hover:bg-[#F0FDF4]/30 hover:shadow-md bg-white transition-all duration-300 relative group"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="h-14 w-14 rounded-full bg-[#DCFCE7] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                <UploadCloud className="h-7 w-7 text-[#16A34A]" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm text-foreground">Drop a photo here or tap to browse</p>
                <p className="text-[11px] text-muted-foreground mt-1">Supports JPEG, PNG up to 5MB</p>
              </div>
              <Button
                variant="outline"
                className="mt-1 h-9 border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4] text-xs font-semibold px-4 rounded-xl"
              >
                Browse Files
              </Button>
            </div>

            {/* Suggestion Tag Pills */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                Try scanning one of these
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { key: "hintBus", defaultVal: "Bus ticket", emoji: "🚌" },
                  { key: "hintFood", defaultVal: "Food plate", emoji: "🍽️" },
                  { key: "hintMeter", defaultVal: "Electricity meter", emoji: "⚡" },
                  { key: "hintReceipt", defaultVal: "Shopping receipt", emoji: "🛒" },
                  { key: "hintVehicle", defaultVal: "Car / vehicle", emoji: "🚗" }
                ].map((hint) => (
                  <span
                    key={hint.key}
                    className="text-xs bg-white border border-[#E5E7EB] px-3 py-1 rounded-full text-muted-foreground font-medium shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-neutral-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span>{hint.emoji}</span>
                    <span>{t(`visionUpload.${hint.key}`, hint.defaultVal)}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* AI Info Banner */}
            <div className="p-4 rounded-2xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] flex gap-3 items-start shadow-sm">
              <Bot className="h-5 w-5 shrink-0 text-[#16A34A]" />
              <div>
                <h4 className="text-xs font-bold">AI Carbon Analysis</h4>
                <p className="text-[11px] text-[#166534] leading-relaxed mt-0.5">
                  EcoTrace uses computer vision to instantly identify your activity type and estimate its carbon intensity. Confirm or adjust the quantity before logging.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInputChange}
            />
          </motion.div>
        )}

        {/* ── PREVIEW: show image + analyse button ── */}
        {stage === "preview" && imagePreview && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-muted shadow-md group">
              <img src={imagePreview} alt="Preview" className="w-full max-h-60 object-contain" />
              <button
                onClick={reset}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80 dark:bg-black/75 hover:bg-background dark:hover:bg-black backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-foreground border border-border/50 shadow-sm transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <Button
              className="interactive w-full h-10 text-xs font-bold rounded-xl gap-2 bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-md hover:shadow-[var(--glow-green)]"
              onClick={analyse}
            >
              <Camera className="h-4 w-4" />
              {t("visionUpload.analyseCta")}
            </Button>
          </motion.div>
        )}

        {/* ── ANALYZING: chat-style pulsing with scanning line ── */}
        {stage === "analyzing" && imagePreview && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-muted/20 shadow-inner">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain opacity-55" />
              {/* Green sweep scanning line */}
              <div 
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--eco-bright)] to-transparent z-20 shadow-[0_0_8px_var(--eco-bright)]"
                style={{ animation: "scan-laser 2s ease-in-out infinite" }}
              />
            </div>

            <div className="flex flex-col gap-3 mt-1">
              <ChatBubble side="right">{t("visionUpload.uploadedBubble")}</ChatBubble>
              <ChatBubble avatar="🤖">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-[var(--eco-primary)]" />
                  <span className="text-muted-foreground font-semibold">{t("visionUpload.analyzingBubble")}</span>
                </div>
                <div className="mt-1">
                  <TypingDots />
                </div>
              </ChatBubble>
            </div>
          </motion.div>
        )}

        {/* ── RESULT: needs confirmation ── */}
        {(stage === "result" || stage === "confirming") && result?.detected && imagePreview && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-border bg-muted/10 shadow-sm">
              <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-contain" />
            </div>

            <div className="flex flex-col gap-3">
              <ChatBubble side="right">{t("visionUpload.uploadedBubble")}</ChatBubble>
              <ChatBubble avatar="🌿">
                <div className="space-y-2">
                  <p className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                    <span className="text-sm shrink-0">{CATEGORY_EMOJI[result.detected.category] ?? "📦"}</span>
                    {t("visionUpload.detectedBubble", { activity: getActivityLabel(result.detected.category, result.detected.activityType) })}
                  </p>
                  <p className="text-muted-foreground text-[10px] leading-relaxed font-medium">{result.description}</p>
                  
                  <div className="mt-2.5 pt-2 border-t border-border/40">
                    <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                      <span>{t("visionUpload.confidence")}</span>
                      <span className={result.confidence >= 0.65 ? "text-emerald-500" : "text-amber-500"}>
                        {t("visionUpload.surePercent", { pct: Math.round(result.confidence * 100) })}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted dark:bg-muted/10 overflow-hidden w-full">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          result.confidence >= 0.65 
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500" 
                            : "bg-gradient-to-r from-amber-400 to-amber-500"
                        )}
                        style={{ width: `${Math.round(result.confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </ChatBubble>

              <ChatBubble avatar="📊">
                <p className="text-[10px] text-muted-foreground font-bold mb-2">{t("visionUpload.confirmValPrompt")}</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 h-8 text-xs font-semibold px-2 py-0.5 bg-muted/20 border-border/80 focus-visible:ring-[var(--eco-primary)]/20 rounded-lg"
                  />
                  <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{result.detected.unit}</Label>
                </div>
                <p className="mt-2 text-xs font-extrabold text-[var(--eco-primary)] flex items-center gap-1">
                  <Leaf className="h-3.5 w-3.5" />
                  {t("visionUpload.carbonOutput", { co2: finalCo2.toFixed(3) })}
                </p>
              </ChatBubble>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-9.5 text-xs font-bold rounded-xl border-border/80 hover:bg-emerald-500/5 hover:text-[var(--eco-primary)]" onClick={reset}>
                {t("visionUpload.retake")}
              </Button>
              <Button
                className="interactive flex-1 h-9.5 text-xs font-bold rounded-xl gap-2 bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-md hover:shadow-[var(--glow-green)]"
                onClick={confirmLog}
                disabled={stage === "confirming" || !editValue || parseFloat(editValue) <= 0}
              >
                {stage === "confirming" ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("visionUpload.logging")}</>
                ) : (
                  <><Leaf className="h-4 w-4" /> {t("visionUpload.logCta")}</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── DONE: success ── */}
        {stage === "done" && result?.detected && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-col gap-3">
              <ChatBubble side="right">{t("visionUpload.uploadedBubble")}</ChatBubble>
              <ChatBubble avatar="🌿">
                <p className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{CATEGORY_EMOJI[result.detected.category] ?? "📦"}</span>
                  {t("visionUpload.detectedBubble", { activity: getActivityLabel(result.detected.category, result.detected.activityType) })}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-relaxed">{result.description}</p>
              </ChatBubble>
              <ChatBubble side="right" avatar="🌿">{t("visionUpload.uploadedBubble")} ✓</ChatBubble>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="saas-card relative overflow-hidden border border-emerald-500/20 bg-emerald-500/5 p-6 text-center rounded-2xl shadow-md"
            >
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-pulse" />
              </motion.div>

              <p className="text-base font-extrabold text-[var(--eco-primary)] tracking-tight">{t("visionUpload.loggedSuccess")}</p>
              <p className="text-2xl font-black text-foreground mt-1 tracking-tight">
                <CountUp 
                  end={result.autoLogged ? result.detected.co2Amount : finalCo2} 
                  decimals={3} 
                  duration={1.2} 
                />{" "}
                <span className="text-xs font-semibold text-muted-foreground">kg CO₂</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-1 leading-snug">
                {t("visionUpload.addedToFootprint", { activity: getActivityLabel(result.detected.category, result.detected.activityType) })}
              </p>
            </motion.div>

            <Button
              className="interactive w-full h-10 text-xs font-bold rounded-xl gap-2 bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-md hover:shadow-[var(--glow-green)]"
              onClick={reset}
            >
              <Camera className="h-4 w-4" /> {t("visionUpload.scanAnother")}
            </Button>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {stage === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {imagePreview && (
              <div className="rounded-2xl overflow-hidden border border-border bg-muted/10 shadow-sm">
                <img src={imagePreview} alt="Preview" className="w-full max-h-40 object-contain opacity-50" />
              </div>
            )}
            <div className="flex flex-col gap-3">
              <ChatBubble side="right">{t("visionUpload.uploadedBubble")}</ChatBubble>
              <ChatBubble avatar="⚠️">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="font-extrabold text-xs text-foreground">{t("visionUpload.errorTitle")}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-medium">
                      {result?.description ?? t("visionUpload.errorDesc")}
                    </p>
                  </div>
                </div>
              </ChatBubble>
            </div>
            <Button variant="outline" className="w-full h-10 text-xs font-bold rounded-xl gap-2 border-border/80 hover:bg-emerald-500/5 hover:text-[var(--eco-primary)]" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> {t("visionUpload.tryAgain")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
