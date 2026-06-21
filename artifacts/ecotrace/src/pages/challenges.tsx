import { useSessionId } from "@/hooks/use-session";
import { useListChallenges, getListChallengesQueryKey, useListChallengeCompletions, getListChallengeCompletionsQueryKey, useCompleteChallenge } from "@workspace/api-client-react";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Flame, Target, Trophy, Loader2, Leaf, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import CountUp from "react-countup";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

export default function Challenges() {
  const { t } = useTranslation();
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: challenges, isLoading: challengesLoading } = useListChallenges(
    { query: { queryKey: getListChallengesQueryKey() } }
  );

  const { data: completions, isLoading: completionsLoading } = useListChallengeCompletions(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId, queryKey: getListChallengeCompletionsQueryKey({ sessionId: sessionId! }) } }
  );

  const completeChallenge = useCompleteChallenge({
    mutation: {
      onSuccess: () => {
        if (sessionId) {
          queryClient.invalidateQueries({ queryKey: getListChallengeCompletionsQueryKey({ sessionId }) });
          queryClient.invalidateQueries({ queryKey: ["wallet", sessionId] });
        }
        toast({
          title: t("challengesPage.completed"),
          description: "Great job reducing your footprint.",
        });
      }
    }
  });

  const isCompleted = (challengeId: number) => {
    return completions?.some(c => c.challengeId === challengeId);
  };

  const handleComplete = (challengeId: number) => {
    if (!sessionId || completeChallenge.isPending) return;
    completeChallenge.mutate({
      id: challengeId,
      data: { sessionId }
    });
  };

  if (challengesLoading || completionsLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <Skeleton className="h-10 w-48 rounded-xl bg-muted/40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl bg-muted/40" />
          <Skeleton className="h-40 rounded-2xl bg-muted/40" />
          <Skeleton className="h-40 rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
  }

  const completedCount = completions?.length || 0;
  const totalCount = challenges?.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'medium': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'hard': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <motion.div 
      className="space-y-6 max-w-5xl mx-auto p-2"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--eco-primary)]/10 dark:bg-[var(--eco-primary)]/20 flex items-center justify-center border border-[var(--eco-primary)]/20 shadow-[0_0_15px_rgba(22,163,74,0.1)]">
            <Target className="h-5 w-5 text-[var(--eco-primary)] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-emerald-600 dark:to-emerald-400 bg-clip-text text-transparent">
              {t("challengesPage.title")}
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("challengesPage.desc")}
            </p>
          </div>
        </div>
        
        {/* Stats Panel */}
        <motion.div variants={item} className="saas-card flex items-center gap-5 p-3.5 border border-border/80 shadow-[var(--shadow-soft)] w-full sm:w-auto relative overflow-hidden">
          <div className="absolute right-0 top-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/25 shrink-0">
              <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500/30 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Streak</p>
              <div className="text-sm font-extrabold text-foreground leading-none mt-0.5">
                <CountUp end={completedCount > 0 ? Math.ceil(completedCount / 2) : 0} duration={1} />
              </div>
            </div>
          </div>

          <div className="w-px h-6 bg-border/60"></div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25 shrink-0">
              <Trophy className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t("challengesPage.completed")}</p>
              <div className="text-sm font-extrabold text-foreground leading-none mt-0.5">
                <CountUp end={completedCount} duration={1} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Bar & Details */}
      <motion.div variants={item} className="saas-card p-4 border border-border/80 shadow-[var(--shadow-soft)] space-y-2.5 max-w-xl">
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground px-0.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-spin" style={{ animationDuration: "6s" }} />
            Challenge Progress
          </span>
          <span className="text-[var(--eco-primary)]">{completedCount} of {totalCount} completed</span>
        </div>

        <div className="bg-muted dark:bg-muted/10 p-0.5 border border-border/40 rounded-full overflow-hidden flex items-center relative h-3.5 w-full">
          <div 
            className="absolute left-0.5 top-0.5 bottom-0.5 bg-gradient-to-r from-emerald-500 to-[var(--eco-primary)] rounded-full transition-all duration-1000 ease-out"
            style={{ width: `calc(${progressPercent}% - 4px)` }}
          />
        </div>
      </motion.div>

      {/* Grid of Challenges */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challenges?.map((challenge) => {
          const completed = isCompleted(challenge.id);
          
          return (
            <motion.div key={challenge.id} variants={item}>
              <div className={cn(
                "saas-card h-full flex flex-col justify-between relative overflow-hidden transition-all duration-300 border p-5",
                completed 
                  ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.03)]" 
                  : "hover:scale-[1.015] hover:shadow-md hover:border-emerald-500/30",
              )}>
                {completed && (
                  <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 rounded-bl-full flex items-start justify-end p-2.5 z-10">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
                  </div>
                )}
                
                <div className="pb-3 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", getDifficultyColor(challenge.difficulty))}>
                      {challenge.difficulty}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1 shrink-0">
                      <Leaf className="h-3 w-3 shrink-0" />
                      -{challenge.co2Reduction}kg CO₂
                    </span>
                  </div>

                  <h3 className={cn("text-xs font-bold leading-snug text-foreground", completed && "opacity-60 line-through")}>
                    {challenge.title}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                    {challenge.description}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className={cn("w-1.5 h-1.5 rounded-full inline-block", CATEGORY_COLORS[challenge.category])}></span>
                    {t(`logActivity.categories.${challenge.category}`)}
                  </div>
                  
                  <Button 
                    variant={completed ? "secondary" : "default"}
                    size="sm"
                    className={cn(
                      "text-[9px] font-bold h-7.5 px-3 rounded-lg transition-all cursor-pointer", 
                      completed 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none pointer-events-none" 
                        : "interactive bg-[var(--eco-primary)] hover:bg-[var(--eco-best)] text-white shadow-sm hover:shadow-[var(--glow-green)]"
                    )}
                    disabled={completed || completeChallenge.isPending}
                    onClick={() => handleComplete(challenge.id)}
                  >
                    {completed ? (
                      t("challengesPage.completed")
                    ) : completeChallenge.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("challengesPage.join")
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}