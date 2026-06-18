import { useRef, useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import {
  useGetActivitySummary,
  getGetActivitySummaryQueryKey,
  useListChallengeCompletions,
  getListChallengeCompletionsQueryKey,
  useListChallenges,
  getListChallengesQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, Share2, Leaf, TreePine, Plane, Star, BarChart3 } from "lucide-react";
import { toPng } from "html-to-image";
import { CATEGORY_LABELS } from "@/lib/constants";

const ADJECTIVES = [
  "Solar","Verdant","Leafy","Mossy","Breeze","Tidal","Alpine","Misty",
  "Amber","Birch","Cedar","Fern","Grove","Hazel","Ivy","Jade",
];
const NOUNS = [
  "Fox","Owl","Deer","Bear","Wolf","Hare","Lynx","Hawk",
  "Otter","Crane","Finch","Robin","Raven","Wren","Vole","Mink",
];

function sessionToDisplayName(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (Math.imul(31, hash) + sessionId.charCodeAt(i)) | 0;
  }
  const adj = ADJECTIVES[Math.abs(hash) % ADJECTIVES.length];
  const noun = NOUNS[Math.abs(hash >> 8) % NOUNS.length];
  const num = Math.abs(hash >> 16) % 100;
  return `${adj} ${noun} #${String(num).padStart(2, "0")}`;
}

function getGrade(dailyAvg: number, globalAvg: number): { letter: string; label: string; color: string } {
  const ratio = dailyAvg / globalAvg;
  if (ratio <= 0.3) return { letter: "A+", label: "Climate Champion", color: "#1e4a36" };
  if (ratio <= 0.5) return { letter: "A", label: "Eco Leader", color: "#2d6a4f" };
  if (ratio <= 0.7) return { letter: "B+", label: "Green Thinker", color: "#40916c" };
  if (ratio <= 0.9) return { letter: "B", label: "Conscious Citizen", color: "#52b788" };
  if (ratio <= 1.1) return { letter: "C", label: "Average Footprint", color: "#e07825" };
  if (ratio <= 1.5) return { letter: "D", label: "Room to Improve", color: "#c75a10" };
  return { letter: "F", label: "High Impact", color: "#991b1b" };
}

export default function Report() {
  const sessionId = useSessionId();
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useGetActivitySummary(
    { sessionId: sessionId!, days: 30 },
    { query: { enabled: !!sessionId, queryKey: getGetActivitySummaryQueryKey({ sessionId: sessionId!, days: 30 }) } }
  );

  const { data: completions, isLoading: completionsLoading } = useListChallengeCompletions(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListChallengeCompletionsQueryKey({ sessionId: sessionId! }) } }
  );

  const { data: challenges, isLoading: challengesLoading } = useListChallenges(
    { query: { queryKey: getListChallengesQueryKey() } }
  );

  const isLoading = summaryLoading || completionsLoading || challengesLoading;

  const displayName = sessionId ? sessionToDisplayName(sessionId) : "Eco Traveler";

  const co2Saved = (() => {
    if (!completions || !challenges) return 0;
    const challengeMap = new Map(challenges.map((c) => [c.id, c]));
    return completions.reduce((sum, c) => sum + (challengeMap.get(c.challengeId)?.co2Reduction ?? 0), 0);
  })();

  const grade = summary
    ? getGrade(summary.dailyAverage, summary.globalAverage)
    : null;

  const topCategory = summary?.byCategory.length
    ? summary.byCategory.reduce((a, b) => (a.co2Amount > b.co2Amount ? a : b))
    : null;

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  async function captureCard(): Promise<string> {
    if (!cardRef.current) throw new Error("Card not found");
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      style: { borderRadius: "16px" },
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const dataUrl = await captureCard();
      const link = document.createElement("a");
      link.download = `ecotrace-report-${displayName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const dataUrl = await captureCard();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "ecotrace-report.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "My EcoTrace Report",
          text: `${displayName} — ${summary?.totalCo2.toFixed(1)} kg CO₂ logged, ${co2Saved.toFixed(1)} kg saved. Check your footprint at EcoTrace!`,
          files: [file],
        });
      } else {
        await handleDownload();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Your Eco Report</h1>
        <p className="text-muted-foreground mt-1">
          A snapshot of your environmental impact — download and share it.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[480px] w-full rounded-2xl" />
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* The shareable card */}
          <div
            ref={cardRef}
            style={{
              background: "linear-gradient(135deg, #1e4a36 0%, #2d6a4f 50%, #1e3a2f 100%)",
              borderRadius: "16px",
              padding: "40px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
              minHeight: "480px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            {/* Decorative background circles */}
            <div style={{
              position: "absolute", top: -80, right: -80,
              width: 280, height: 280,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -60, left: -60,
              width: 220, height: 220,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.03)",
              pointerEvents: "none",
            }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px",
                }}>
                  🌿
                </div>
                <span style={{ fontWeight: 700, fontSize: "18px", letterSpacing: "-0.02em" }}>EcoTrace</span>
              </div>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{today}</span>
            </div>

            {/* Name + grade */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "4px" }}>
                  Report for
                </div>
                <div style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                  Last 30 days
                </div>
              </div>
              {grade && (
                <div style={{
                  flexShrink: 0,
                  background: grade.color,
                  borderRadius: "12px",
                  padding: "10px 18px",
                  textAlign: "center",
                  minWidth: "72px",
                }}>
                  <div style={{ fontSize: "32px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>
                    {grade.letter}
                  </div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.85)", marginTop: "4px", fontWeight: 600 }}>
                    {grade.label}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.12)" }} />

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                {
                  icon: "📊",
                  label: "Total CO₂ Logged",
                  value: `${summary?.totalCo2.toFixed(1) ?? "0"} kg`,
                  sub: `${summary?.dailyAverage.toFixed(1) ?? "0"} kg/day avg`,
                },
                {
                  icon: "🌱",
                  label: "CO₂ Saved",
                  value: `${co2Saved.toFixed(1)} kg`,
                  sub: `${completions?.length ?? 0} challenges done`,
                },
                {
                  icon: "🌳",
                  label: "Trees Equivalent",
                  value: `${summary?.treeEquivalent.toFixed(1) ?? "0"}`,
                  sub: "trees absorb this yearly",
                },
                {
                  icon: "✈️",
                  label: "Flight Hours",
                  value: `${summary?.flightHoursEquivalent.toFixed(1) ?? "0"} hrs`,
                  sub: "of flying equivalent",
                },
              ].map((stat) => (
                <div key={stat.label} style={{
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <div style={{ fontSize: "20px", marginBottom: "8px" }}>{stat.icon}</div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Top category + vs global */}
            {topCategory && (
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{
                  flex: 1,
                  background: "rgba(224,120,37,0.2)",
                  border: "1px solid rgba(224,120,37,0.4)",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}>
                  <span style={{ fontSize: "20px" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Biggest Source
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "2px" }}>
                      {CATEGORY_LABELS[topCategory.category] ?? topCategory.category}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "1px" }}>
                      {topCategory.co2Amount.toFixed(1)} kg · {topCategory.percentage.toFixed(0)}% of total
                    </div>
                  </div>
                </div>
                {summary && (
                  <div style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <span style={{ fontSize: "20px" }}>🌍</span>
                    <div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        vs. Global Avg
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "2px" }}>
                        {summary.dailyAverage < summary.globalAverage
                          ? `${((1 - summary.dailyAverage / summary.globalAverage) * 100).toFixed(0)}% below`
                          : `${((summary.dailyAverage / summary.globalAverage - 1) * 100).toFixed(0)}% above`}
                      </div>
                      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginTop: "1px" }}>
                        Global avg: {summary.globalAverage} kg/day
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "16px",
            }}>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
                Generated by EcoTrace · Track your impact
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {["🚗", "🍃", "⚡", "🛍️"].map((emoji) => (
                  <span key={emoji} style={{
                    fontSize: "14px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "6px",
                    padding: "3px 6px",
                  }}>
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 gap-2 py-6 text-base rounded-xl"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="h-5 w-5" />
              {downloading ? "Generating..." : "Download PNG"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 py-6 text-base rounded-xl"
              onClick={handleShare}
              disabled={sharing}
            >
              <Share2 className="h-5 w-5" />
              {sharing ? "Sharing..." : "Share"}
            </Button>
          </div>

          {/* Summary stats below card */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: <BarChart3 className="h-4 w-4" />, label: "Daily avg", value: `${summary?.dailyAverage.toFixed(1) ?? "—"} kg` },
              { icon: <Star className="h-4 w-4" />, label: "Challenges", value: completions?.length ?? 0 },
              { icon: <Leaf className="h-4 w-4" />, label: "CO₂ saved", value: `${co2Saved.toFixed(1)} kg` },
            ].map((s) => (
              <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
                <div className="flex justify-center text-muted-foreground mb-1">{s.icon}</div>
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
