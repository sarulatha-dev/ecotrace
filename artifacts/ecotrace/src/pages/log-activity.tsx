import { useState } from "react";
import { useSessionId } from "@/hooks/use-session";
import { useCreateActivity, getGetActivitySummaryQueryKey, getListActivitiesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CATEGORY_COLORS, CATEGORY_LABELS, ACTIVITY_TYPES } from "@/lib/constants";
import { ActivityCategory } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LogActivity() {
  const sessionId = useSessionId();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [category, setCategory] = useState<ActivityCategory | null>(null);
  const [activityType, setActivityType] = useState<string | null>(null);
  const [value, setValue] = useState<string>("");

  const createActivity = useCreateActivity({
    mutation: {
      onSuccess: () => {
        if (sessionId) {
          queryClient.invalidateQueries({ queryKey: getGetActivitySummaryQueryKey({ sessionId }) });
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey({ sessionId }) });
        }
        toast({
          title: "Activity logged",
          description: "Your carbon footprint has been updated.",
        });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to log activity. Please try again.",
          variant: "destructive"
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !category || !activityType || !value || isNaN(Number(value))) return;

    createActivity.mutate({
      data: {
        sessionId,
        category,
        activityType,
        value: Number(value)
      }
    });
  };

  const selectedActivityDef = category && activityType 
    ? ACTIVITY_TYPES[category as keyof typeof ACTIVITY_TYPES].find(a => a.id === activityType)
    : null;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto min-h-[calc(100vh-5rem)] flex items-center">
      <Card className="w-full shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Log Activity</CardTitle>
          <CardDescription>Record an action to see its carbon impact.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-4">
              <Label className="text-base">1. Select Category</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(CATEGORY_LABELS) as ActivityCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      setActivityType(null);
                      setValue("");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                      category === cat 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <span className={cn("text-lg font-medium", category === cat ? "text-primary" : "text-foreground")}>
                      {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS]}
                    </span>
                    <span className={cn("mt-1 text-2xl", CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS])}>•</span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {category && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <Label className="text-base">2. What did you do?</Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {ACTIVITY_TYPES[category as keyof typeof ACTIVITY_TYPES].map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => {
                          setActivityType(act.id);
                          if (!value) setValue("1");
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          activityType === act.id 
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                            : "border-border bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-lg",
                          activityType === act.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <act.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className={cn("font-medium text-sm", activityType === act.id ? "text-primary" : "text-foreground")}>{act.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">per {act.unit}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {activityType && selectedActivityDef && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <Label className="text-base">3. How much?</Label>
                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-[200px]">
                      <Input 
                        type="number" 
                        min="0.1" 
                        step="0.1" 
                        required 
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="text-lg py-6 pl-4 pr-16 bg-muted/20 border-border/60 focus-visible:ring-primary/30"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                        {selectedActivityDef.unit}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-6 border-t">
              <Button 
                type="submit" 
                className="w-full py-6 text-lg rounded-xl shadow-sm"
                disabled={!category || !activityType || !value || isNaN(Number(value)) || createActivity.isPending}
              >
                {createActivity.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Log Impact"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}