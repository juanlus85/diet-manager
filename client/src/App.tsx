import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Today from "./pages/Today";
import Calendar from "./pages/Calendar";
import MenuHistory from "./pages/MenuHistory";
import DietUpload from "./pages/DietUpload";
import Shopping from "./pages/Shopping";
import WeightTracker from "./pages/WeightTracker";
import Recipes from "./pages/Recipes";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Today} />
        <Route path={"/calendar"} component={Calendar} />
        <Route path={"/menu-history"} component={MenuHistory} />
        <Route path={"/upload"} component={DietUpload} />
        <Route path={"/shopping"} component={Shopping} />
        <Route path={"/weight"} component={WeightTracker} />
        <Route path={"/recipes"} component={Recipes} />
        <Route path={"/reports"} component={Reports} />
        <Route path={"/profile"} component={Profile} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
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
