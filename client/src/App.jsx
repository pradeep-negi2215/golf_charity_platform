import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ScoresPage from "./pages/ScoresPage";
import DrawResultsPage from "./pages/DrawResultsPage";
import CharityPage from "./pages/CharityPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/subscription" element={<SubscriptionPage />} />
      <Route path="/scores" element={<ScoresPage />} />
      <Route path="/draw-results" element={<DrawResultsPage />} />
      <Route path="/charities" element={<CharityPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
