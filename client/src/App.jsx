import { Navigate, Route, Routes } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SignupPage from "./pages/SignupPage";
import AdminSignupPage from "./pages/AdminSignupPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ScoresPage from "./pages/ScoresPage";
import DrawResultsPage from "./pages/DrawResultsPage";
import CharityPage from "./pages/CharityPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin-signup" element={<AdminSignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/scores" element={<ScoresPage />} />
        <Route path="/draw-results" element={<DrawResultsPage />} />
        <Route path="/charities" element={<CharityPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ThemeToggle />
    </>
  );
}

export default App;
