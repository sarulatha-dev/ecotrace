import { useState, useRef, useCallback } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";
import { getGetActivitySummaryQueryKey, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, RotateCcw, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ACTIVITY_TYPES } from "@/lib/constants";

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
          className="h-2 w-2 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function ChatBubble({ children, side = "left" }: { children: React.ReactNode; side?: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
        side === "left"
          ? "self-start bg-card border rounded-tl-sm"
          : "self-end bg-primary text-primary-foreground rounded-tr-sm"
      )}
    >
      {children}
    </motion.div>
  );
}

export default function VisionUpload() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast({ title: "Error", description: "Failed to log activity", variant: "destructive" });
        setStage("result");
        return;
      }
      invalidateQueries();
      setStage("done");
    } catch {
      toast({ title: "Error", description: "Connection error", variant: "destructive" });
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
    return types.find((t) => t.id === activityType)?.label ?? activityType;
  };

  const finalCo2 = result?.detected
    ? (parseFloat(editValue) || result.detected.value) *
      (result.detected.co2Amount / (result.detected.value || 1))
    : 0;

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Photo Scan</h1>
            <p className="text-muted-foreground text-sm">Upload a photo — AI detects the carbon activity</p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── IDLE: upload zone ── */}
        {stage === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-primary/50 hover:bg-primary/2 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Drop a photo here</p>
                <p className="text-sm text-muted-foreground mt-1">or tap to browse</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {["Bus ticket", "Food plate", "Electricity meter", "Shopping receipt", "Car / vehicle"].map((hint) => (
                  <span key={hint} className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                    {hint}
                  </span>
                ))}
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
            <div className="relative rounded-2xl overflow-hidden border bg-muted">
              <img src={imagePreview} alt="Preview" className="w-full max-h-72 object-contain" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <Button className="w-full py-6 text-base rounded-xl gap-2" onClick={analyse}>
              <Camera className="h-5 w-5" />
              Analyse Photo
            </Button>
          </motion.div>
        )}

        {/* ── ANALYZING: chat-style pulsing ── */}
        {stage === "analyzing" && imagePreview && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="rounded-2xl overflow-hidden border bg-muted">
              <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-contain opacity-60" />
            </div>
            <div className="flex flex-col gap-3 mt-2">
              <ChatBubble side="right">Photo uploaded ✓</ChatBubble>
              <ChatBubble>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">Analysing your photo…</span>
                </div>
                <TypingDots />
              </ChatBubble>
            </div>
          </motion.div>
        )}

        {/* ── RESULT: needs confirmation ── */}
        {(stage === "result" || stage === "confirming") && result?.detected && imagePreview && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="rounded-2xl overflow-hidden border bg-muted">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain" />
            </div>

            <div className="flex flex-col gap-3">
              <ChatBubble side="right">Photo uploaded ✓</ChatBubble>
              <ChatBubble>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {CATEGORY_EMOJI[result.detected.category] ?? "📦"} I detected:{" "}
                    {getActivityLabel(result.detected.category, result.detected.activityType)}
                  </p>
                  <p className="text-muted-foreground text-xs">{result.description}</p>
                  <div className="mt-2 pt-2 border-t border-border/60">
                    <p className="text-xs text-muted-foreground mb-0.5">Confidence</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden w-full">
                      <div
                        className={cn("h-full rounded-full", result.confidence >= 0.65 ? "bg-green-500" : "bg-amber-400")}
                        style={{ width: `${Math.round(result.confidence * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs mt-0.5">{Math.round(result.confidence * 100)}% sure</p>
                  </div>
                </div>
              </ChatBubble>
              <ChatBubble>
                <p className="text-xs text-muted-foreground mb-2">Please confirm the value:</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <Label className="text-sm text-muted-foreground">{result.detected.unit}</Label>
                </div>
                <p className="mt-2 text-sm font-semibold text-primary">
                  Carbon: {finalCo2.toFixed(3)} kg CO₂
                </p>
              </ChatBubble>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={reset}>
                Retake
              </Button>
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={confirmLog}
                disabled={stage === "confirming" || !editValue || parseFloat(editValue) <= 0}
              >
                {stage === "confirming" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Logging…</>
                ) : (
                  <><Leaf className="h-4 w-4" /> Log Activity</>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── DONE: success ── */}
        {stage === "done" && result?.detected && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-col gap-3">
              <ChatBubble side="right">Photo uploaded ✓</ChatBubble>
              <ChatBubble>
                <p className="font-semibold">
                  {CATEGORY_EMOJI[result.detected.category] ?? "📦"} Detected:{" "}
                  {getActivityLabel(result.detected.category, result.detected.activityType)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{result.description}</p>
              </ChatBubble>
              <ChatBubble side="right">Log this ✓</ChatBubble>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-3"
              >
                <CheckCircle2 className="h-14 w-14 text-primary" />
              </motion.div>
              <p className="text-xl font-bold text-primary">Logged!</p>
              <p className="text-3xl font-bold mt-1">
                {result.autoLogged
                  ? result.detected.co2Amount.toFixed(3)
                  : finalCo2.toFixed(3)}{" "}
                <span className="text-lg font-normal text-muted-foreground">kg CO₂</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {getActivityLabel(result.detected.category, result.detected.activityType)} added to your footprint
              </p>
            </motion.div>

            <Button className="w-full rounded-xl py-6" onClick={reset}>
              <Camera className="h-5 w-5 mr-2" /> Scan Another Photo
            </Button>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {stage === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {imagePreview && (
              <div className="rounded-2xl overflow-hidden border bg-muted">
                <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain opacity-50" />
              </div>
            )}
            <div className="flex flex-col gap-3">
              <ChatBubble side="right">Photo uploaded ✓</ChatBubble>
              <ChatBubble>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Couldn't identify an activity</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result?.description ?? "Try a clearer photo of a ticket, food, electricity meter, or receipt."}
                    </p>
                  </div>
                </div>
              </ChatBubble>
            </div>
            <Button className="w-full rounded-xl py-6" onClick={reset}>
              <RotateCcw className="h-5 w-5 mr-2" /> Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
