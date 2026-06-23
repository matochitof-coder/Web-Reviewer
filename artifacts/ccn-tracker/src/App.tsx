import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Ranking from "@/pages/ranking";
import Qualifier from "@/pages/qualifier";
import Tournaments from "@/pages/tournaments";
import TeamSearch from "@/pages/team-search";
import MiClan from "@/pages/mi-clan";
import Settings from "@/pages/settings";
import { ThemeProvider } from "@/context/theme";
import { LangProvider } from "@/context/lang";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/ranking" component={Ranking} />
        <Route path="/clasificatorio" component={Qualifier} />
        <Route path="/torneos" component={Tournaments} />
        <Route path="/equipo" component={TeamSearch} />
        <Route path="/mi-clan" component={MiClan} />
        <Route path="/configuracion" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <ThemeProvider>
      <LangProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LangProvider>
    </ThemeProvider>
  );
}

export default App;
