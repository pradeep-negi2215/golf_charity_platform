import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authApi, drawsApi, scoresApi, subscriptionApi } from "../services/api";

const daysLeft = (endAt) => {
  if (!endAt) {
    return 0;
  }

  const delta = new Date(endAt).getTime() - Date.now();
  if (delta <= 0) {
    return 0;
  }

  return Math.ceil(delta / (1000 * 60 * 60 * 24));
};

function DashboardPage() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [scores, setScores] = useState([]);
  const [drawHistory, setDrawHistory] = useState([]);
  const [scoreValue, setScoreValue] = useState("");
  const [scoreDate, setScoreDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [meResponse, subscriptionResponse, scoresResponse, historyResponse] = await Promise.all([
          authApi.me(),
          subscriptionApi.getStatus(),
          scoresApi.list(),
          drawsApi.getHistory({ limit: 12 })
        ]);

        if (isMounted) {
          setUser(meResponse.data.user);
          setSubscriptionStatus(subscriptionResponse.data);
          setScores(scoresResponse.data.scores || []);
          setDrawHistory(historyResponse.data.history || []);
          localStorage.setItem("authUser", JSON.stringify(meResponse.data.user));
        }
      } catch (error) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        if (isMounted) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (!localStorage.getItem("authToken")) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <section className="auth-card">
          <p>Loading your account...</p>
        </section>
      </div>
    );
  }

  const remainingDays = daysLeft(subscriptionStatus?.endAt);

  const winningsOverview = useMemo(() => {
    const participated = drawHistory.filter((entry) => entry.participated).length;
    const totalWinnings = drawHistory.reduce((sum, entry) => sum + Number(entry.winnings || 0), 0);
    const winningMonths = drawHistory.filter((entry) => Number(entry.winnings || 0) > 0).length;
    const bestMatch = drawHistory.reduce((max, entry) => Math.max(max, Number(entry.matchCount || 0)), 0);

    return {
      participated,
      totalWinnings,
      winningMonths,
      bestMatch
    };
  }, [drawHistory]);

  const latestScore = scores[0] || null;

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const addScore = async (event) => {
    event.preventDefault();
    setActionError("");
    setActionSuccess("");

    const numericValue = Number(scoreValue);
    if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 45) {
      setActionError("Score must be between 1 and 45");
      return;
    }

    if (!scoreDate) {
      setActionError("Score date is required");
      return;
    }

    setSavingScore(true);
    try {
      const response = await scoresApi.add({
        value: numericValue,
        date: scoreDate
      });

      setScores(response.data.scores || []);
      setScoreValue("");
      setActionSuccess("Score recorded successfully.");
    } catch (error) {
      setActionError(error.response?.data?.message || "Unable to save score");
    } finally {
      setSavingScore(false);
    }
  };

  const logout = () => {
    authApi
      .logout()
      .catch(() => null)
      .finally(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        navigate("/login", { replace: true });
      });
  };

  return (
    <div className="dashboard-layout">
      <section className="dashboard-shell">
        <header className="dashboard-hero">
          <div>
            <h1>Member Dashboard</h1>
            <p className="subtext">Welcome back, {user?.firstName}. Here is your full subscription, score, and draw view.</p>
          </div>
          <button type="button" onClick={logout} className="secondary-btn">
            Log out
          </button>
        </header>

        <div className="dashboard-grid">
          <section className="dashboard-card">
            <h2>Subscription Status</h2>
            <p>
              <strong>Status:</strong>{" "}
              <span className={subscriptionStatus?.isActive ? "status-pill active" : "status-pill inactive"}>
                {subscriptionStatus?.isActive ? "Active" : "Inactive"}
              </span>
            </p>
            <p>
              <strong>Plan:</strong> {subscriptionStatus?.planType || "none"}
            </p>
            <p>
              <strong>Days Left:</strong> {remainingDays}
            </p>
            <Link to="/subscription" className="inline-link-btn">
              Manage Subscription
            </Link>
          </section>

          <section className="dashboard-card">
            <h2>Charity Commitment</h2>
            <p>
              <strong>Selected Charity:</strong> {user?.selectedCharity?.name || "Not set"}
            </p>
            <p>
              <strong>Category:</strong> {user?.selectedCharity?.category || "-"}
            </p>
            <p>
              <strong>Contribution Percentage:</strong> {Number(user?.donationPercentage || 10)}%
            </p>
            <Link to="/charities" className="inline-link-btn">
              Update Charity Selection
            </Link>
            {user?.role === "admin" ? (
              <Link to="/admin" className="inline-link-btn">
                Open Admin Panel
              </Link>
            ) : null}
          </section>

          <section className="dashboard-card dashboard-card-wide">
            <h2>Score Entry and History</h2>
            <form className="score-form" onSubmit={addScore}>
              <div className="grid-two">
                <label>
                  Score (1-45)
                  <input
                    type="number"
                    min="1"
                    max="45"
                    value={scoreValue}
                    onChange={(event) => setScoreValue(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={scoreDate}
                    onChange={(event) => setScoreDate(event.target.value)}
                    required
                  />
                </label>
              </div>
              <button type="submit" disabled={savingScore}>
                {savingScore ? "Saving..." : "Add Score"}
              </button>
            </form>
            {actionError ? <p className="error-text">{actionError}</p> : null}
            {actionSuccess ? <p className="success-text">{actionSuccess}</p> : null}
            <p className="switch-text">
              Latest: {latestScore ? `${latestScore.value} on ${formatDate(latestScore.date)}` : "No scores yet"}
            </p>
            <div className="scores-list">
              {scores.length ? (
                scores.map((score) => (
                  <article key={score._id} className="score-row">
                    <span className="score-value">{score.value}</span>
                    <span className="score-date">{formatDate(score.date)}</span>
                  </article>
                ))
              ) : (
                <p className="subtext">No score history available yet.</p>
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <h2>Winnings Overview</h2>
            <p>
              <strong>Total Winnings:</strong> GBP {winningsOverview.totalWinnings.toFixed(2)}
            </p>
            <p>
              <strong>Winning Months:</strong> {winningsOverview.winningMonths}
            </p>
            <p>
              <strong>Participated Draws:</strong> {winningsOverview.participated}
            </p>
            <p>
              <strong>Best Match:</strong> {winningsOverview.bestMatch}
            </p>
            <Link to="/draw-results" className="inline-link-btn">
              View Latest Draw Details
            </Link>
          </section>

          <section className="dashboard-card dashboard-card-wide">
            <h2>Draw Participation History</h2>
            <div className="draw-history-list">
              {drawHistory.length ? (
                drawHistory.map((entry) => (
                  <article key={entry.monthKey} className="draw-history-row">
                    <div>
                      <p className="draw-history-title">{entry.monthKey}</p>
                      <p className="switch-text">Draw numbers: {(entry.drawNumbers || []).join(", ") || "-"}</p>
                    </div>
                    <div className="draw-history-stats">
                      <span className={entry.participated ? "status-pill active" : "status-pill inactive"}>
                        {entry.participated ? "Participated" : "No Entry"}
                      </span>
                      <span>Matches: {entry.matchCount || 0}</span>
                      <span>Winnings: GBP {Number(entry.winnings || 0).toFixed(2)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="subtext">No draw history available yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
