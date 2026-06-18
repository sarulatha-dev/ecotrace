import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import LogActivity from "@/pages/log-activity";
import Challenges from "@/pages/challenges";
import Insights from "@/pages/insights";
import Leaderboard from "@/pages/leaderboard";
import Coach from "@/pages/coach";
import Report from "@/pages/report";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/log" component={LogActivity} />
        <Route path="/challenges" component={Challenges} />
        <Route path="/insights" component={Insights} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/coach" component={Coach} />
        <Route path="/report" component={Report} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
