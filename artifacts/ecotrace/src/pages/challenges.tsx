import { useSessionId } from "@/hooks/use-session";
import { useListChallenges, getListChallengesQueryKey, useListChallengeCompletions, getListChallengeCompletionsQueryKey, useCompleteChallenge } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Flame, Target, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Challenges() {
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
        }
        toast({
          title: "Challenge completed!",
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
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const completedCount = completions?.length || 0;
  const totalCount = challenges?.length || 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'hard': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <motion.h1 variants={item} className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Eco Challenges
          </motion.h1>
          <motion.p variants={item} className="text-muted-foreground mt-1">
            Complete actions to reduce your impact and build a streak.
          </motion.p>
        </div>
        
        <motion.div variants={item} className="bg-card border rounded-2xl p-4 flex items-center gap-6 shadow-sm w-full md:w-auto">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xl">
              <Flame className="h-5 w-5 fill-amber-500" />
              {completedCount > 0 ? Math.ceil(completedCount / 2) : 0}
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Day Streak</span>
          </div>
          <div className="w-px h-10 bg-border"></div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-primary font-bold text-xl">
              <Trophy className="h-5 w-5" />
              {completedCount}
            </div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Completed</span>
          </div>
        </motion.div>
      </div>

      {/* Progress bar */}
      <motion.div variants={item} className="bg-muted/30 p-1 border rounded-full overflow-hidden flex items-center relative h-3 w-full max-w-2xl">
        <div 
          className="absolute left-0 top-0 bottom-0 bg-primary rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {challenges?.map((challenge) => {
          const completed = isCompleted(challenge.id);
          
          return (
            <motion.div key={challenge.id} variants={item}>
              <Card className={cn(
                "h-full flex flex-col transition-all duration-300 relative overflow-hidden",
                completed ? "bg-muted/20 border-primary/20 shadow-none" : "shadow-sm hover:shadow-md hover:border-primary/40",
              )}>
                {completed && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full flex items-start justify-end p-2 z-10">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn("text-xs font-semibold px-2 py-1 rounded-md border", getDifficultyColor(challenge.difficulty))}>
                      {challenge.difficulty.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-primary px-2 py-1 bg-primary/10 rounded-md">
                      -{challenge.co2Reduction}kg CO₂
                    </span>
                  </div>
                  <CardTitle className={cn("text-lg", completed && "text-muted-foreground")}>{challenge.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className={cn("text-sm", completed ? "text-muted-foreground/70" : "text-muted-foreground")}>
                    {challenge.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-4 text-xs font-medium text-foreground/70">
                    <span className={CATEGORY_COLORS[challenge.category]}>•</span>
                    {CATEGORY_LABELS[challenge.category]}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant={completed ? "secondary" : "default"}
                    className={cn("w-full transition-all", completed && "opacity-70 cursor-default")}
                    disabled={completed || completeChallenge.isPending}
                    onClick={() => handleComplete(challenge.id)}
                  >
                    {completed ? "Completed" : completeChallenge.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Challenge"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}