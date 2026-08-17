import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useState } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const Onboarding = lazy(() => import("./pages/Onboarding"));
const ImageSolver = lazy(() => import("./pages/ImageSolver"));
const AdminWorkspace = lazy(() => import("./pages/AdminWorkspace"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const OfficialNoticesPage = lazy(() => import("./pages/OfficialNoticesPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const GovernanceWorkspace = lazy(() => import("./pages/GovernanceWorkspace"));
const QuestionIntakeWorkspace = lazy(() => import("./pages/QuestionIntakeWorkspace"));
const AdmissionPatternsPage = lazy(() => import("./pages/AdmissionPatternsPage"));
const ExamLabPage = lazy(() => import("./pages/ExamLabPage"));
const LiveExamPage = lazy(() => import("./pages/LiveExamPage"));
const LeaderboardPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.LeaderboardPage })));
const RevisionPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.RevisionPage })));
const CommunityPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.CommunityPage })));
const ImporterPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.ImporterPage })));

function RouteLoader() { return <div className="grid min-h-screen place-items-center bg-[#f4f7f7] text-sm font-semibold text-[#087b6c]">Loading MCQ GURU…</div>; }

function Router({ language, onLanguageChange }: { language: "bn" | "en"; onLanguageChange: (value: "bn" | "en") => void }) {
  return <Suspense fallback={<RouteLoader />}><Switch>
    <Route path="/onboarding">{() => <Onboarding language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/image-solver">{() => <ImageSolver language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/admin">{() => <AdminWorkspace language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/governance">{() => <GovernanceWorkspace language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/notifications">{() => <NotificationsPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/settings">{() => <SettingsPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/notices">{() => <OfficialNoticesPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/profile">{() => <AccountPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/questions/new">{() => <QuestionIntakeWorkspace language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/admission-patterns">{() => <AdmissionPatternsPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/mcq-lab">{() => <ExamLabPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/live-exam">{() => <LiveExamPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/leaderboard">{() => <LeaderboardPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/cheat-sheets">{() => <RevisionPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/mistake-vault">{() => <RevisionPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/community">{() => <CommunityPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/import">{() => <ImporterPage language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/">{() => <Home language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

function App() {
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router language={language} onLanguageChange={setLanguage} /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
