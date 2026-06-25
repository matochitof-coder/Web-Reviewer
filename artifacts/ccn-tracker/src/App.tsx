import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import Matches from "@/pages/matches";
import Ranking from "@/pages/ranking";
import Qualifier from "@/pages/qualifier";
import Tournaments from "@/pages/tournaments";
import TeamSearch from "@/pages/team-search";
import MiClan from "@/pages/mi-clan";
import Settings from "@/pages/settings";
import Paises from "@/pages/paises";
import Mundial from "@/pages/mundial";
import Armys from "@/pages/armys";
import Legal from "@/pages/legal";
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
        <Route path="/matches" component={Matches} />
        <Route path="/ranking" component={Ranking} />
        <Route path="/clasificatorio" component={Qualifier} />
        <Route path="/torneos" component={Tournaments} />
        <Route path="/equipo" component={TeamSearch} />
        <Route path="/mi-clan" component={MiClan} />
        <Route path="/paises" component={Paises} />
        <Route path="/mundial" component={Mundial} />
        <Route path="/armys" component={Armys} />
        <Route path="/configuracion" component={Settings} />
        <Route path="/legal" component={Legal} />
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
