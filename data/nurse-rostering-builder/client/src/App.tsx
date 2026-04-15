import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import NurseProfileManagement from "./pages/NurseProfileManagement";
import ScheduleEditorPage from "./pages/ScheduleEditorPage";
import ScheduleList from "./pages/ScheduleList";
import ScheduleDetail from "./pages/ScheduleDetail";
import MySchedulePage from "./pages/MySchedulePage";
import OffRequestPage from "./pages/OffRequestPage";
import ShiftSwapPage from "./pages/ShiftSwapPage";
import RequestManagementPage from "./pages/RequestManagementPage";
import AnalyticsDashboardPage from "./pages/AnalyticsDashboardPage";
import ShiftSwapLogsPage from "./pages/ShiftSwapLogsPage";
import ScheduleConfirmationPage from "./pages/ScheduleConfirmationPage";
import ScheduleDeploymentPage from "./pages/ScheduleDeploymentPage";
import { NurseProfilePage } from "./pages/NurseProfilePage";
import { AdminRealtimeDashboard } from "./pages/AdminRealtimeDashboard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/schedules" component={ScheduleList} />
      <Route path="/admin/schedules/:id" component={ScheduleDetail} />
      <Route path="/admin/profiles" component={NurseProfileManagement} />
      <Route path="/admin/requests" component={RequestManagementPage} />
      <Route path="/admin/analytics" component={AnalyticsDashboardPage} />
      <Route path="/admin/swap-logs" component={ShiftSwapLogsPage} />
      <Route path="/admin/confirmations" component={ScheduleConfirmationPage} />
      <Route path="/admin/deployment" component={ScheduleDeploymentPage} />
      <Route path="/admin/realtime" component={AdminRealtimeDashboard} />
      <Route path="/admin/nurses/:id" component={NurseProfilePage} />
      <Route path="/nurse/dashboard" component={NurseDashboard} />
      <Route path="/nurse/my-schedule" component={MySchedulePage} />
      <Route path="/nurse/off-request" component={OffRequestPage} />
      <Route path="/nurse/shift-swap" component={ShiftSwapPage} />
      <Route path="/schedule-editor" component={ScheduleEditorPage} />
      <Route path="/404" component={NotFound} />
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
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
