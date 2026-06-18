import { useSessionId } from "@/hooks/use-session";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Star, Leaf, TreePine } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants";

const RANK_STYLES: Record<number, { bg: string; text: string; icon: React.ReactNode }> = {
  1: { bg: "bg-amber-50 border-amber-200", text: "text-amber-600", icon: <Trophy className="h-5 w-5 text-amber-500" /> },
  2: { bg: "bg-slate-50 border-slate-200", text: "text-slate-500", icon: <Medal className="h-5 w-5 text-slate-400" /> },
  3: { bg: "bg-orange-50 border-orange-200", text: "text-orange-600", icon: <Medal className="h-5 w-5 text-orange-400" /> },
};

export default function Leaderboard() {
  const sessionId = useSessionId();

  const { data: entries, isLoading } = useGetLeaderboard(
    { sessionId: sessionId ?? undefined },
    { query: { enabled: true, queryKey: getGetLeaderboardQueryKey({ sessionId: sessionId ?? undefined }) } }
  );

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  const topThree = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Community Leaderboard</h1>
        <p className="text-muted-foreground mt-1">
          Anonymous rankings by CO₂ reduced through eco-challenges.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-5 rounded-full bg-primary/10 mb-5">
            <TreePine className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No entries yet</h2>
          <p className="text-muted-foreground max-w-xs">
            Complete eco-challenges to appear on the leaderboard and inspire others.
          </p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* Podium for top 3 */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((entry, podiumIdx) => {
                const visualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
                const rankStyle = RANK_STYLES[visualRank] ?? {};
                return (
                  <motion.div
                    key={entry.rank}
                    variants={item}
                    className={cn(
                      "flex flex-col items-center justify-end rounded-xl border p-4 pb-5",
                      heights[visualRank as keyof typeof heights],
                      rankStyle.bg,
                      entry.isCurrentUser && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <div className="mb-1">{rankStyle.icon}</div>
                    <div className="font-semibold text-sm text-center leading-tight truncate w-full text-center">
                      {entry.displayName}
                    </div>
                    <div className={cn("text-xs font-bold mt-1", rankStyle.text)}>
                      {entry.co2Reduced} kg saved
                    </div>
                    {entry.isCurrentUser && (
                      <span className="mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          {entries.map((entry) => {
            const rankStyle = RANK_STYLES[entry.rank];
            return (
              <motion.div
                key={entry.rank}
                variants={item}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all",
                  entry.isCurrentUser
                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                    : "bg-card border-border hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm",
                  entry.rank <= 3
                    ? cn(rankStyle?.bg, rankStyle?.text)
                    : "bg-muted text-muted-foreground"
                )}>
                  {entry.rank <= 3 ? rankStyle?.icon : `#${entry.rank}`}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{entry.displayName}</span>
                    {entry.isCurrentUser && (
                      <span className="flex-shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {entry.challengesCompleted} challenge{entry.challengesCompleted !== 1 ? "s" : ""}
                    </span>
                    <span>·</span>
                    <span className="capitalize">
                      Best: {CATEGORY_LABELS[entry.topCategory] ?? entry.topCategory}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <Leaf className="h-4 w-4" />
                    <span>{entry.co2Reduced} kg</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">CO₂ saved</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
