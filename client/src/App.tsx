import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import TimelinesAdmin from "./pages/TimelinesAdmin";
import UsersAdmin from "./pages/UsersAdmin";
import Timeline from "./pages/Timeline";
import LoginLocal from "./pages/LoginLocal";
import ComissoesList from "./pages/ComissoesList";

function Router() {
  return (
    <WouterRouter base="/config">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login-local" component={LoginLocal} />
        <Route path="/admin" component={TimelinesAdmin} />
        <Route path="/admin/timelines" component={TimelinesAdmin} />
        <Route path="/admin/users" component={UsersAdmin} />
        <Route path="/admin/:timelineId" component={Admin} />
        <Route path="/timeline" component={Timeline} />
        <Route path="/timeline/:slug" component={Timeline} />
        <Route path="/comissoes" component={ComissoesList} />
        <Route path="/comissoes/:slug" component={Timeline} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
