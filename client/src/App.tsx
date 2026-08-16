import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import ImageSolver from "./pages/ImageSolver";
import AdminWorkspace from "./pages/AdminWorkspace";
import NotificationsPage from "./pages/NotificationsPage";
import OfficialNoticesPage from "./pages/OfficialNoticesPage";
import AccountPage from "./pages/AccountPage";
import GovernanceHub from "./pages/GovernanceHub";
import GovernanceWorkspace from "./pages/GovernanceWorkspace";
import QuestionIntakePage from "./pages/QuestionIntakePage";
import QuestionIntakeWorkspace from "./pages/QuestionIntakeWorkspace";
import AdmissionPatternsPage from "./pages/AdmissionPatternsPage";
import { useState } from "react";

function Router({ language, onLanguageChange }: { language: "bn" | "en"; onLanguageChange: (value: "bn" | "en") => void }) {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/onboarding"}>{() => <Onboarding language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/image-solver"}>{() => <ImageSolver language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/admin"}>{() => <AdminWorkspace language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/governance"}>{() => <GovernanceWorkspace language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/notifications"}>{() => <NotificationsPage language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/notices"}>{() => <OfficialNoticesPage language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/profile"}>{() => <AccountPage language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/questions/new"}>{() => <QuestionIntakeWorkspace language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/admission-patterns"}>{() => <AdmissionPatternsPage language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/"}>{() => <Home language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/:rest*"}>{() => <Home language={language} onLanguageChange={onLanguageChange} />}</Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router language={language} onLanguageChange={setLanguage} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
