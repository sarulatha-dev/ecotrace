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
import { Download, Share2, Leaf, Star, BarChart3, ChevronRight, Award } from "lucide-react";
import { toPng } from "html-to-image";
import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

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

function getGrade(dailyAvg: number, globalAvg: number): { letter: string; key: string; color: string; bgGradient: string; glowShadow: string } {
  const ratio = dailyAvg / globalAvg;
  if (ratio <= 0.3) return { letter: "A+", key: "champ", color: "#166534", bgGradient: "linear-gradient(135deg, #15803d 0%, #166534 100%)", glowShadow: "0 0 15px rgba(22,163,74,0.3)" };
  if (ratio <= 0.5) return { letter: "A", key: "leader", color: "#14532d", bgGradient: "linear-gradient(135deg, #166534 0%, #14532d 100%)", glowShadow: "0 0 15px rgba(21,128,61,0.25)" };
  if (ratio <= 0.7) return { letter: "B+", key: "thinker", color: "#15803d", bgGradient: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)", glowShadow: "0 0 15px rgba(34,197,94,0.2)" };
  if (ratio <= 0.9) return { letter: "B", key: "citizen", color: "#22c55e", bgGradient: "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)", glowShadow: "0 0 12px rgba(74,222,128,0.2)" };
  if (ratio <= 1.1) return { letter: "C", key: "avg", color: "#d97706", bgGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", glowShadow: "0 0 12px rgba(245,158,11,0.2)" };
  if (ratio <= 1.5) return { letter: "D", key: "improve", color: "#b45309", bgGradient: "linear-gradient(135deg, #ea580c 0%, #b45309 100%)", glowShadow: "0 0 12px rgba(234,88,12,0.2)" };
  return { letter: "F", key: "impact", color: "#991b1b", bgGradient: "linear-gradient(135deg, #ef4444 0%, #991b1b 100%)", glowShadow: "0 0 15px rgba(239,68,68,0.25)" };
}

export default function Report() {
  const { t } = useTranslation();
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

  const today = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  async function captureCard(): Promise<string> {
    if (!cardRef.current) throw new Error("Card not found");
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      style: { borderRadius: "20px" },
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--eco-primary)]/10 dark:bg-[var(--eco-primary)]/20 flex items-center justify-center border border-[var(--eco-primary)]/20 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
          <Award className="h-5 w-5 text-[var(--eco-primary)] animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
            {t("reportPage.title")}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">{t("reportPage.desc")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[420px] w-full rounded-2xl bg-muted/40" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 rounded-xl bg-muted/40" />
            <Skeleton className="h-10 flex-1 rounded-xl bg-muted/40" />
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="space-y-6"
        >
          {/* Shareable Card - Upgraded style for rich visual export */}
          <div
            ref={cardRef}
            style={{
              background: "linear-gradient(135deg, #061c11 0%, #0d2e1f 50%, #030d08 100%)",
              borderRadius: "20px",
              padding: "36px 32px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
              minHeight: "440px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              border: "1px solid rgba(22, 163, 74, 0.22)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* Background mesh glows */}
            <div style={{
              position: "absolute", top: -90, right: -90,
              width: 300, height: 300,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", bottom: -80, left: -80,
              width: 260, height: 260,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Top row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "10px",
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
                  fontSize: "15px",
                }}>
                  🌿
                </div>
                <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.03em" }}>EcoTrace</span>
              </div>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{today}</span>
            </div>

            {/* Name + Grade */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  {t("reportPage.reportFor")}
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  {displayName}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px", fontWeight: 500 }}>
                  {t("reportPage.last30days")}
                </div>
              </div>
              
              {grade && (
                <div style={{
                  flexShrink: 0,
                  background: grade.bgGradient,
                  borderRadius: "14px",
                  padding: "10px 16px",
                  textAlign: "center",
                  minWidth: "72px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: grade.glowShadow,
                }}>
                  <div style={{ fontSize: "32px", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>
                    {grade.letter}
                  </div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.9)", marginTop: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {t("reportPage.grades." + grade.key)}
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />

            {/* Stats Dashboard Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                {
                  icon: "📊",
                  label: t("reportPage.totalLogged"),
                  value: `${summary?.totalCo2.toFixed(1) ?? "0"} kg`,
                  sub: t("reportPage.dailyAvgVal", { avg: summary?.dailyAverage.toFixed(1) ?? "0" }),
                },
                {
                  icon: "🌱",
                  label: t("reportPage.co2Saved"),
                  value: `${co2Saved.toFixed(1)} kg`,
                  sub: t("reportPage.challengesDone", { count: completions?.length ?? 0 }),
                },
                {
                  icon: "🌳",
                  label: t("reportPage.treesEquiv"),
                  value: `${summary?.treeEquivalent.toFixed(1) ?? "0"}`,
                  sub: t("reportPage.treesEquivSub"),
                },
                {
                  icon: "✈️",
                  label: t("reportPage.flightHours"),
                  value: `${summary?.flightHoursEquivalent.toFixed(1) ?? "0"} hrs`,
                  sub: t("reportPage.flightHoursSub"),
                },
              ].map((stat) => (
                <div key={stat.label} style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "12px",
                  padding: "14px",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "16px", marginBottom: "4px" }}>{stat.icon}</div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "4px", fontWeight: 500 }}>
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom details block */}
            {topCategory && (
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <div style={{
                  flex: 1,
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(249,115,22,0.22)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: "200px",
                }}>
                  <span style={{ fontSize: "18px" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {t("reportPage.biggestSource")}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "13px", color: "#f97316", marginTop: "2px" }}>
                      {t(`logActivity.categories.${topCategory.category}`) || topCategory.category}
                    </div>
                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "2px", fontWeight: 500 }}>
                      {t("reportPage.sourceStats", { co2: topCategory.co2Amount.toFixed(1), pct: topCategory.percentage.toFixed(0) })}
                    </div>
                  </div>
                </div>
                {summary && (
                  <div style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minWidth: "200px",
                  }}>
                    <span style={{ fontSize: "18px" }}>🌍</span>
                    <div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {t("reportPage.vsGlobal")}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "13px", color: summary.dailyAverage < summary.globalAverage ? "#22c55e" : "#ea580c", marginTop: "2px" }}>
                        {summary.dailyAverage < summary.globalAverage
                          ? t("reportPage.belowGlobal", { pct: ((1 - summary.dailyAverage / summary.globalAverage) * 100).toFixed(0) })
                          : t("reportPage.aboveGlobal", { pct: ((summary.dailyAverage / summary.globalAverage - 1) * 100).toFixed(0) })}
                      </div>
                      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", marginTop: "2px", fontWeight: 500 }}>
                        {t("reportPage.globalAvgVal", { avg: summary.globalAverage.toFixed(1) })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer row */}
            <div style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "14px",
            }}>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>
                {t("reportPage.generatedBy")}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {["🚗", "🍃", "⚡", "🛍️"].map((emoji) => (
                  <span key={emoji} style={{
                    fontSize: "11px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "6px",
                    padding: "3px 5px",
                    border: "1px solid rgba(255,255,255,0.05)"
                  }}>
                    {emoji}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons with premium style */}
          <div className="flex gap-4">
            <Button
              className="interactive flex-1 gap-2 rounded-xl font-bold text-xs h-10 bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-md hover:shadow-[var(--glow-green)] transition-all"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="h-4 w-4" />
              {downloading ? t("reportPage.generating") : t("reportPage.downloadPng")}
            </Button>
            <Button
              variant="outline"
              className="interactive flex-1 gap-2 rounded-xl font-bold text-xs h-10 border-border/80 text-foreground hover:bg-emerald-500/5 transition-all"
              onClick={handleShare}
              disabled={sharing}
            >
              <Share2 className="h-4 w-4" />
              {sharing ? t("reportPage.sharing") : t("reportPage.share")}
            </Button>
          </div>

          {/* Summary stats below card - upgraded to matching saas-card style */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <BarChart3 className="h-4.5 w-4.5 text-sky-500" />, label: t("reportPage.dailyAvg"), value: summary?.dailyAverage.toFixed(1) ?? "—", unit: "kg" },
              { icon: <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20" />, label: t("reportPage.challenges"), value: completions?.length ?? 0, unit: "done" },
              { icon: <Leaf className="h-4.5 w-4.5 text-[var(--eco-primary)]" />, label: t("reportPage.co2SavedText"), value: co2Saved.toFixed(1), unit: "kg" },
            ].map((s) => (
              <div key={s.label} className="saas-card relative overflow-hidden p-4 text-center border border-border/80 shadow-[var(--shadow-soft)] flex flex-col justify-between items-center">
                <div className="h-8 w-8 rounded-lg bg-muted/40 dark:bg-muted/10 border border-border/40 flex items-center justify-center mb-2.5">
                  {s.icon}
                </div>
                <div>
                  <div className="text-base font-extrabold text-foreground leading-none">
                    <CountUp end={Number(s.value) || 0} decimals={typeof s.value === "string" ? 1 : 0} duration={1.2} />
                    <span className="text-[10px] font-medium text-muted-foreground ml-0.5">{s.unit}</span>
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mt-1.5 leading-tight">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
