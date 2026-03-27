import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authApi, charityApi } from "../services/api";

const pickRandom = (items) => {
  if (!items.length) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
};

const buildQuickPickNumbers = () => {
  const pool = Array.from({ length: 45 }, (_, index) => index + 1);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, 5).sort((a, b) => a - b);
};

function SettingsPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [charitySpotlight, setCharitySpotlight] = useState(null);
  const [quickPick, setQuickPick] = useState(() => buildQuickPickNumbers());

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoadingCharity, setIsLoadingCharity] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    let isMounted = true;

    const loadSpotlight = async () => {
      setIsLoadingCharity(true);
      try {
        const response = await charityApi.list({ status: "active" });
        const list = response.data || [];
        if (isMounted) {
          setCharitySpotlight(pickRandom(list));
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Unable to load charity spotlight");
        }
      } finally {
        if (isMounted) {
          setIsLoadingCharity(false);
        }
      }
    };

    loadSpotlight();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSpotlight = async () => {
    setError("");
    setSuccess("");
    setIsLoadingCharity(true);
    try {
      const response = await charityApi.list({ status: "active" });
      const list = response.data || [];
      setCharitySpotlight(pickRandom(list));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to refresh charity spotlight");
    } finally {
      setIsLoadingCharity(false);
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all password fields");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await authApi.changePassword({
        currentPassword,
        newPassword
      });

      setSuccess(response.data?.message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="auth-layout">
      <section className="auth-card settings-card">
        <h1>Settings</h1>
        <p className="subtext">Manage your account preferences, security, and quick tools.</p>

        <div className="settings-grid">
          <section className="settings-panel">
            <h2>Appearance</h2>
            <p className="switch-text">Switch between light and dark mode.</p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? "Disable Dark Mode" : "Enable Dark Mode"}
            </button>
          </section>

          <section className="settings-panel">
            <h2>Lucky Draw Quick Pick</h2>
            <p className="switch-text">Random 5-number pick for your monthly draw inspiration.</p>
            <p className="metric-value">{quickPick.join(" - ")}</p>
            <button type="button" className="secondary-btn" onClick={() => setQuickPick(buildQuickPickNumbers())}>
              Generate New Pick
            </button>
          </section>

          <section className="settings-panel">
            <h2>Charity Spotlight</h2>
            <p className="switch-text">Discover a random active charity from the platform.</p>
            {isLoadingCharity ? <p className="switch-text">Loading spotlight...</p> : null}
            {charitySpotlight ? (
              <div className="status-panel" style={{ marginTop: "8px" }}>
                <p><strong>{charitySpotlight.name}</strong></p>
                <p className="switch-text">{charitySpotlight.category || "General"} | {charitySpotlight.country || "UK"}</p>
                <p className="switch-text">{charitySpotlight.description || "No description provided."}</p>
              </div>
            ) : null}
            <button type="button" className="secondary-btn" onClick={refreshSpotlight} disabled={isLoadingCharity}>
              {isLoadingCharity ? "Refreshing..." : "Try Another Charity"}
            </button>
          </section>
        </div>

        <section className="settings-panel">
          <h2>Change Password</h2>
          <form className="settings-form" onSubmit={onChangePassword}>
            <label>
              Current Password
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            {error ? <p className="error-text">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}

            <button type="submit" className="cta-btn" disabled={isChangingPassword}>
              {isChangingPassword ? "Updating password..." : "Update Password"}
            </button>
          </form>
        </section>

        <p className="switch-text">
          Back to <Link to="/dashboard">Dashboard</Link>
        </p>
      </section>
    </div>
  );
}

export default SettingsPage;
