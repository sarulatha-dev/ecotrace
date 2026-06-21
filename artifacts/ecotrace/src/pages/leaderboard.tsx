import { useSessionId } from "@/hooks/use-session";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Star, Leaf, TreePine, ShieldAlert, Award, Compass, Zap, Flame, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FloatingCard } from "@/components/FloatingCard";

const RANK_STYLES: Record<number, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  1: { 
    bg: "bg-gradient-to-b from-amber-500/20 to-amber-600/5", 
    border: "border-amber-400/40",
    text: "text-amber-400", 
    icon: <Trophy className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> 
  },
  2: { 
    bg: "bg-gradient-to-b from-slate-400/20 to-slate-500/5", 
    border: "border-slate-400/30",
    text: "text-slate-300", 
    icon: <Medal className="h-5 w-5 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]" /> 
  },
  3: { 
    bg: "bg-gradient-to-b from-orange-400/20 to-orange-500/5", 
    border: "border-orange-500/30",
    text: "text-orange-400", 
    icon: <Medal className="h-5 w-5 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]" /> 
  },
};

interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  unlocked: boolean;
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const sessionId = useSessionId();

  const { data: entries, isLoading } = useGetLeaderboard(
    { sessionId: sessionId ?? undefined },
    { query: { enabled: true, queryKey: getGetLeaderboardQueryKey({ sessionId: sessionId ?? undefined }) } }
  );

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  const topThree = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  // Find current user stats
  const currentUserEntry = entries?.find(e => e.isCurrentUser);
  const nextRankEntry = currentUserEntry && currentUserEntry.rank > 1 
    ? entries?.find(e => e.rank === currentUserEntry.rank - 1) 
    : null;

  const co2ToNextRank = nextRankEntry && currentUserEntry
    ? +(nextRankEntry.co2Reduced - currentUserEntry.co2Reduced).toFixed(1)
    : 0;

  // Motivation Badges Collection
  const badges: Badge[] = [
    { id: "ninja", name: "Carbon Ninja", desc: "Save 30+ kg CO₂", icon: "🥷", color: "#10b981", unlocked: (currentUserEntry?.co2Reduced ?? 0) >= 30 },
    { id: "pioneer", name: "Eco Pioneer", desc: "Complete 5+ challenges", icon: "🌲", color: "#3b82f6", unlocked: (currentUserEntry?.challengesCompleted ?? 0) >= 5 },
    { id: "saver", name: "Energy Master", desc: "Keep food footprint low", icon: "⚡", color: "#f59e0b", unlocked: currentUserEntry?.topCategory === "food" || currentUserEntry?.topCategory === "energy" },
    { id: "champion", name: "Green Champion", desc: "Reach Leaderboard Top 3", icon: "🏆", color: "#ec4899", unlocked: (currentUserEntry?.rank ?? 99) <= 3 },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">{t("leaderboardPage.title")}</h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {t("leaderboardPage.desc")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl bg-muted/40" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-32 bg-muted/40 rounded-xl" />
            <Skeleton className="h-36 bg-muted/40 rounded-xl" />
            <Skeleton className="h-32 bg-muted/40 rounded-xl" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center saas-card border border-border/80 shadow-[var(--shadow-soft)]">
          <div className="p-4 rounded-full bg-emerald-500/10 mb-4 border border-emerald-500/20">
            <TreePine className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">{t("leaderboardPage.noEntries")}</h2>
          <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
            {t("leaderboardPage.completePrompt")}
          </p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Comparative Summary Panel */}
          {currentUserEntry && (
            <motion.div variants={item}>
              <FloatingCard className="relative overflow-hidden p-5 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-muted/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[var(--eco-primary)] shadow-lg">
                      <Award className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        Your Leaderboard Status: Rank #{currentUserEntry.rank}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {nextRankEntry ? (
                          <>
                            You need <span className="text-[var(--eco-primary)] font-bold">{co2ToNextRank} kg</span> savings to overtake <span className="text-foreground font-semibold">{nextRankEntry.displayName}</span> (Rank #{nextRankEntry.rank})!
                          </>
                        ) : (
                          "You're currently in first place! Outstanding work, Climate Leader! 🌟"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Relative comparative progress */}
                  <div className="w-full sm:w-64 bg-muted/30 border border-border/80 p-3 rounded-xl flex flex-col justify-between h-full">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground mb-1.5 font-bold">
                      <span>Progress comparison</span>
                      <span className="text-[var(--eco-primary)]">{(currentUserEntry.co2Reduced / Math.max(...entries.map(e => e.co2Reduced), 1) * 100).toFixed(0)}% of Max</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[var(--eco-primary)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentUserEntry.co2Reduced / Math.max(...entries.map(e => e.co2Reduced), 1)) * 100}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1.5 text-right font-semibold">Saved: {currentUserEntry.co2Reduced} kg CO₂</span>
                  </div>
                </div>
              </FloatingCard>
            </motion.div>
          )}

          {/* Gamified Podium layout for Top 3 */}
          {topThree.length > 0 && (
            <motion.div variants={item} className="grid grid-cols-3 gap-3 items-end max-w-2xl mx-auto pt-6 pb-2">
              {/* Rank 2 Podium */}
              {topThree[1] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-center font-extrabold text-xs text-foreground/80 truncate w-full px-1">{topThree[1].displayName}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">{topThree[1].co2Reduced} kg</div>
                  <motion.div
                    className={cn(
                      "w-full rounded-t-2xl border-t border-x p-3 flex flex-col items-center justify-start relative shadow-xl h-24",
                      RANK_STYLES[2].bg, RANK_STYLES[2].border,
                      topThree[1].isCurrentUser && "ring-2 ring-emerald-500/50 border-emerald-500/40"
                    )}
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute -top-3.5 bg-background p-1.5 rounded-full border border-slate-500/30 shadow-md">
                      {RANK_STYLES[2].icon}
                    </div>
                    <span className="text-xl font-black text-slate-500 dark:text-slate-400 mt-2 font-mono">2</span>
                    {topThree[1].isCurrentUser && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full mt-1.5">
                        You
                      </span>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Rank 1 Podium */}
              {topThree[0] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-center font-extrabold text-sm text-foreground truncate w-full px-1 flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-bounce" />
                    {topThree[0].displayName}
                  </div>
                  <div className="text-xs text-amber-500 dark:text-amber-400 font-extrabold mb-1">{topThree[0].co2Reduced} kg</div>
                  <motion.div
                    className={cn(
                      "w-full rounded-t-2xl border-t border-x p-3 flex flex-col items-center justify-start relative shadow-xl h-32",
                      RANK_STYLES[1].bg, RANK_STYLES[1].border,
                      topThree[0].isCurrentUser && "ring-2 ring-emerald-500/50 border-emerald-500/40"
                    )}
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute -top-4 bg-background p-2 rounded-full border border-amber-500/40 shadow-lg shadow-amber-500/15">
                      {RANK_STYLES[1].icon}
                    </div>
                    <span className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-2.5 font-mono">1</span>
                    {topThree[0].isCurrentUser && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full mt-1.5">
                        You
                      </span>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Rank 3 Podium */}
              {topThree[2] && (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-center font-extrabold text-xs text-foreground/80 truncate w-full px-1">{topThree[2].displayName}</div>
                  <div className="text-[10px] text-orange-500 dark:text-orange-400 font-bold mb-1">{topThree[2].co2Reduced} kg</div>
                  <motion.div
                    className={cn(
                      "w-full rounded-t-2xl border-t border-x p-3 flex flex-col items-center justify-start relative shadow-xl h-20",
                      RANK_STYLES[3].bg, RANK_STYLES[3].border,
                      topThree[2].isCurrentUser && "ring-2 ring-emerald-500/50 border-emerald-500/40"
                    )}
                    whileHover={{ y: -4 }}
                  >
                    <div className="absolute -top-3 bg-background p-1.5 rounded-full border border-orange-500/30 shadow-md">
                      {RANK_STYLES[3].icon}
                    </div>
                    <span className="text-lg font-black text-orange-500 dark:text-orange-400 mt-1 font-mono">3</span>
                    {topThree[2].isCurrentUser && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded-full mt-1.5">
                        You
                      </span>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Badges Achievements Block */}
          <motion.div variants={item} className="saas-card border border-border/80 shadow-[var(--shadow-soft)]">
            <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--eco-primary)]" />
              Motivation Achievements & Badges
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Complete eco activities to unlock rare profile achievements.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {badges.map(b => (
                <div
                  key={b.id}
                  className={cn(
                    "relative border rounded-2xl p-3.5 flex flex-col items-center justify-between text-center transition-all duration-200",
                    b.unlocked 
                      ? "bg-card border-emerald-500/25 hover:border-emerald-500/40 shadow-sm"
                      : "bg-muted/30 border-border/60 opacity-55 grayscale hover:opacity-70"
                  )}
                >
                  <div className="text-3xl mb-1.5">{b.icon}</div>
                  <h4 className="text-xs font-bold text-foreground">{b.name}</h4>
                  <p className="text-[9px] text-muted-foreground leading-relaxed mt-1">{b.desc}</p>
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border mt-3 tracking-wider",
                      b.unlocked 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                        : "bg-neutral-100 dark:bg-neutral-800 text-muted-foreground border-border/60"
                    )}
                  >
                    {b.unlocked ? "Unlocked ✓" : "Locked"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Clean minimal listing layout */}
          <div className="space-y-2.5">
            <h3 className="text-base font-bold text-foreground pl-1">All Contributors</h3>
            {entries.map((entry) => {
              const rankStyle = RANK_STYLES[entry.rank];
              return (
                <motion.div
                  key={entry.rank}
                  variants={item}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200",
                    entry.isCurrentUser
                      ? "bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-sm"
                      : "bg-card border-border/70 hover:border-border hover:bg-muted/20"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                    entry.rank <= 3
                      ? cn(rankStyle?.bg, rankStyle?.text, "border", rankStyle?.border)
                      : "bg-muted text-muted-foreground border border-border/60"
                  )}>
                    {entry.rank <= 3 ? rankStyle?.icon : `#${entry.rank}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">{entry.displayName}</span>
                      {entry.isCurrentUser && (
                        <span className="flex-shrink-0 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          {t("leaderboardPage.you")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-[var(--eco-primary)]" />
                        {t("leaderboardPage.challengesCompleted", { count: entry.challengesCompleted })}
                      </span>
                      <span>·</span>
                      <span className="capitalize">
                        {t("leaderboardPage.bestCategory", { category: t(`logActivity.categories.${entry.topCategory}`) || entry.topCategory })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      <Leaf className="h-4 w-4 text-[var(--eco-primary)]" />
                      <span>{entry.co2Reduced} kg</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{t("leaderboardPage.co2Saved")}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
