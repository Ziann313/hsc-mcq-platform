import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useState } from "react";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { homeRoutePaths, legacyRouteRedirects } from "./routePaths";
import { useAuth } from "./_core/hooks/useAuth";
import { trpc } from "./lib/trpc";
import { resolveFirstVisitState } from "./lib/firstVisitFlow";

const Home = lazy(() => import("./pages/Home"));
const PublicLandingPage = lazy(() => import("./pages/PublicLandingPage"));

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
const ExamHistoryPage = lazy(() => import("./pages/ExamHistoryPage"));
const ExamBlueprintAdminPage = lazy(() => import("./pages/ExamBlueprintAdminPage"));
const HistoricalAnalysisPage = lazy(() => import("./pages/HistoricalAnalysisPage"));
const HistoricalAnalysisAdminPage = lazy(() => import("./pages/HistoricalAnalysisAdminPage"));
const AiGenerationWorkflowPage = lazy(() => import("./pages/AiGenerationWorkflowPage"));
const AdmissionPreparationPage = lazy(() => import("./pages/AdmissionPreparationPage"));
const ExamLabPage = lazy(() => import("./pages/ExamLabPage"));
const ExamPreparationPage = lazy(() => import("./pages/ExamPreparationPage"));
const LearningProgressPage = lazy(() => import("./pages/LearningProgressPage"));
const LiveExamPage = lazy(() => import("./pages/LiveExamPage"));
const LiveExamsPage = lazy(() => import("./pages/LiveExamsPage"));
const TutorPage = lazy(() => import("./pages/TutorPage"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const LeaderboardPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.LeaderboardPage })));
const CheatSheetsPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.CheatSheetsPage })));
const MistakeVaultPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.MistakeVaultPage })));
const CommunityPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.CommunityPage })));
const ImporterPage = lazy(() => import("./pages/MCQInsightsPage").then(module => ({ default: module.ImporterPage })));

function RouteLoader() { return <div className="grid min-h-screen place-items-center bg-[#f4f7f7] px-5 text-center" role="status" aria-live="polite" aria-label="Loading MCQ GURU"><div className="mcq-route-loader"><div className="mcq-route-loader__orbit"><span className="mcq-route-loader__spark mcq-route-loader__spark--one" /><span className="mcq-route-loader__spark mcq-route-loader__spark--two" /><span className="mcq-route-loader__book"><span /><span /><span /></span></div><p className="mt-6 font-display text-xl font-extrabold text-[#071d33]">MCQ GURU</p><p className="mt-1 text-sm font-semibold text-[#087b6c]">Loading your learning space…</p><div className="mcq-route-loader__progress mt-4"><span /></div></div></div>; }

function FirstVisitRoute({ language, onLanguageChange }: { language: "bn" | "en"; onLanguageChange: (value: "bn" | "en") => void }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const profile = trpc.learning.profile.useQuery(undefined, { enabled: isAuthenticated && !authLoading, retry: false, refetchOnWindowFocus: false });
  const state = resolveFirstVisitState({ authLoading, authenticated: isAuthenticated, profileLoading: profile.isLoading, onboardingCompleted: Boolean(profile.data?.onboardingCompletedAt) });
  if (state === "loading") return <RouteLoader />;
  if (state === "public") return <PublicLandingPage language={language} onLanguageChange={onLanguageChange} />;
  if (state === "onboarding") return <Redirect to="/onboarding" />;
  return <Home language={language} onLanguageChange={onLanguageChange} />;
}

function OnboardingRoute({ language, onLanguageChange }: { language: "bn" | "en"; onLanguageChange: (value: "bn" | "en") => void }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const profile = trpc.learning.profile.useQuery(undefined, { enabled: isAuthenticated && !authLoading, retry: false, refetchOnWindowFocus: false });
  const state = resolveFirstVisitState({ authLoading, authenticated: isAuthenticated, profileLoading: profile.isLoading, onboardingCompleted: Boolean(profile.data?.onboardingCompletedAt) });
  if (state === "loading") return <RouteLoader />;
  if (state === "public" || state === "dashboard") return <Redirect to="/" />;
  return <Onboarding language={language} onLanguageChange={onLanguageChange} />;
}

function StudentRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const profile = trpc.learning.profile.useQuery(undefined, { enabled: isAuthenticated && !authLoading, retry: false, refetchOnWindowFocus: false });
  const state = resolveFirstVisitState({ authLoading, authenticated: isAuthenticated, profileLoading: profile.isLoading, onboardingCompleted: Boolean(profile.data?.onboardingCompletedAt) });
  if (state === "loading") return <RouteLoader />;
  if (state === "public") return <Redirect to="/" />;
  if (state === "onboarding") return <Redirect to="/onboarding" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <RouteLoader />;
  if (!isAuthenticated || user?.role !== "admin") return <Redirect to="/" />;
  return <>{children}</>;
}

function Router({ language, onLanguageChange }: { language: "bn" | "en"; onLanguageChange: (value: "bn" | "en") => void }) {
  return <Suspense fallback={<RouteLoader />}><Switch>
    <Route path="/onboarding">{() => <OnboardingRoute language={language} onLanguageChange={onLanguageChange} />}</Route>
    <Route path="/image-solver">{() => <StudentRoute><ImageSolver language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/admin">{() => <AdminRoute><AdminWorkspace language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/governance">{() => <AdminRoute><GovernanceWorkspace language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/notifications">{() => <StudentRoute><NotificationsPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/settings">{() => <StudentRoute><SettingsPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/notices">{() => <StudentRoute><OfficialNoticesPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/profile">{() => <StudentRoute><AccountPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/questions/new">{() => <AdminRoute><QuestionIntakeWorkspace language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/admission-patterns">{() => <AdminRoute><AdmissionPatternsPage language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/exam-history">{() => <StudentRoute><ExamHistoryPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/exam-blueprints">{() => <AdminRoute><ExamBlueprintAdminPage language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/historical-import">{() => <AdminRoute><HistoricalAnalysisAdminPage language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/ai-generation">{() => <AdminRoute><AiGenerationWorkflowPage language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/historical-analysis">{() => <StudentRoute><HistoricalAnalysisPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/admission">{() => <StudentRoute><AdmissionPreparationPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/practice">{() => <StudentRoute><ExamLabPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/tutor">{() => <StudentRoute><TutorPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/mcq-lab"><Redirect to="/practice" /></Route>
    <Route path="/study-plan">{() => <StudentRoute><StudyPlanPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/mistakes"><Redirect to="/mistake-vault" /></Route>
    <Route path="/bookmarks"><Redirect to="/practice" /></Route>
    <Route path="/exams">{() => <StudentRoute><ExamPreparationPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/progress">{() => <StudentRoute><LearningProgressPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/live-exam">{() => <StudentRoute><LiveExamPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/live-exams/:roomId">{() => <StudentRoute><LiveExamsPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/live-exams">{() => <StudentRoute><LiveExamsPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/leaderboard">{() => <StudentRoute><LeaderboardPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/cheat-sheets">{() => <StudentRoute><CheatSheetsPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/mistake-vault">{() => <StudentRoute><MistakeVaultPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/community">{() => <StudentRoute><CommunityPage language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>
    <Route path="/import">{() => <AdminRoute><ImporterPage language={language} onLanguageChange={onLanguageChange} /></AdminRoute>}</Route>
    <Route path="/">{() => <FirstVisitRoute language={language} onLanguageChange={onLanguageChange} />}</Route>
    {homeRoutePaths.filter(path => path !== "/").map(path => <Route key={path} path={path}>{() => <StudentRoute><Home language={language} onLanguageChange={onLanguageChange} /></StudentRoute>}</Route>)}
    {Object.entries(legacyRouteRedirects).map(([from, to]) => <Route key={from} path={from}><Redirect to={to} /></Route>)}
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

function App() {
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router language={language} onLanguageChange={setLanguage} /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
