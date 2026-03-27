import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LocationCurrencyPicker from "../components/LocationCurrencyPicker";
import { useLocationCurrency } from "../hooks/useLocationCurrency";
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
  const [isGuest, setIsGuest] = useState(false);
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
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { selectedCountry, setSelectedCountry, countryOptions, currencyCode, formatMoney } = useLocationCurrency();

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        
        if (!authToken) {
          // Guest mode: show demo data
          if (isMounted) {
            setIsGuest(true);
            setUser({ firstName: "Guest" });
            setSubscriptionStatus({
              isActive: false,
              planType: "Not subscribed",
              endAt: null
            });
            setScores([
              { _id: "demo-1", value: 38, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
              { _id: "demo-2", value: 40, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
              { _id: "demo-3", value: 36, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString() }
            ]);
            setDrawHistory([
              {
                _id: "demo-draw-001",
                monthKey: "March 2026",
                month: "March 2026",
                drawNumbers: [7, 14, 21, 28, 35],
                participated: true,
                matchCount: 4,
                winnings: 125.50
              },
              {
                _id: "demo-draw-002",
                monthKey: "February 2026",
                month: "February 2026",
                drawNumbers: [2, 15, 23, 31, 42],
                participated: true,
                matchCount: 2,
                winnings: 45.00
              }
            ]);
            setLoading(false);
          }
          return;
        }

        const [meResponse, subscriptionResponse, scoresResponse, historyResponse] = await Promise.all([
          authApi.me(),
          subscriptionApi.getStatus(),
          scoresApi.list(),
          drawsApi.getHistory({ limit: 12 })
        ]);

        if (isMounted) {
          setIsGuest(false);
          setUser(meResponse.data.user);
          setSubscriptionStatus(subscriptionResponse.data);
          setScores(scoresResponse.data.scores || []);
          setDrawHistory(historyResponse.data.history || []);
          localStorage.setItem("authUser", JSON.stringify(meResponse.data.user));
        }
      } catch (error) {
        const authToken = localStorage.getItem("authToken");
        
        if (authToken) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          if (isMounted) {
            navigate("/dashboard", { replace: true });
          }
        } else if (isMounted) {
          setLoading(false);
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

  useEffect(() => {
    if (!loading && !isGuest && user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [loading, isGuest, user, navigate]);

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

  const scoreOverview = useMemo(() => {
    const values = scores
      .map((item) => Number(item.value))
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      return {
        total: 0,
        average: 0,
        best: 0
      };
    }

    const total = values.length;
    const average = values.reduce((sum, value) => sum + value, 0) / total;
    const best = Math.min(...values);

    return {
      total,
      average,
      best
    };
  }, [scores]);

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

  const handleAction = (actionName) => {
    if (isGuest) {
      setShowLoginModal(true);
      return false;
    }
    return true;
  };

  const addScore = async (event) => {
    event.preventDefault();
    
    if (!handleAction("add score")) {
      return;
    }

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
    if (isGuest) {
      navigate("/", { replace: true });
      return;
    }

    authApi
      .logout()
      .catch(() => null)
      .finally(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        navigate("/", { replace: true });
      });
  };

  if (loading) {
    return (
      <div className="auth-layout">
        <section className="auth-card">
          <p>Loading your account...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <section className="dashboard-shell">
        {isGuest && (
          <div className="notice-text" style={{ marginBottom: "16px", backgroundColor: "#fffdf0", borderColor: "#d4af37" }}>
            ℹ️ You are viewing as a guest with sample data. Sign up or log in to save your actual scores, manage subscriptions, and participate in draws. Actions require login.
          </div>
        )}
        <header className="dashboard-hero">
          <div>
            <h1>Member Dashboard</h1>
            <p className="subtext">Welcome{isGuest ? "" : " back"}, {user?.firstName}. {isGuest ? "Here is a preview of your dashboard." : "Here is your full subscription, score, and draw view."}</p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {!isGuest ? (
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="secondary-btn"
                style={{ fontSize: "14px", padding: "10px 16px" }}
              >
                Settings
              </button>
            ) : null}
            {user?.role === "admin" && !isGuest ? (
              <button type="button" onClick={() => navigate("/admin")} className="cta-btn"
                      style={{ fontSize: "14px", padding: "10px 16px" }}>
                ⚙️ Admin Panel
              </button>
            ) : null}
            <button type="button" onClick={logout} className="secondary-btn">
              {isGuest ? "Go Back" : "Log out"}
            </button>
          </div>
        </header>

        <LocationCurrencyPicker
          compact
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          countryOptions={countryOptions}
          currencyCode={currencyCode}
        />

        <section className="dashboard-top-metrics" aria-label="Performance summary">
          <article className="metric-tile">
            <p className="metric-label">Subscription</p>
            <p className="metric-value">{subscriptionStatus?.isActive ? "Active" : "Inactive"}</p>
            <p className="metric-sub">{subscriptionStatus?.planType || "No plan selected"}</p>
          </article>
          <article className="metric-tile">
            <p className="metric-label">Average Score</p>
            <p className="metric-value">{scoreOverview.average ? scoreOverview.average.toFixed(1) : "-"}</p>
            <p className="metric-sub">Across {scoreOverview.total} recent rounds</p>
          </article>
          <article className="metric-tile">
            <p className="metric-label">Best Score</p>
            <p className="metric-value">{scoreOverview.best || "-"}</p>
            <p className="metric-sub">Lower is better</p>
          </article>
          <article className="metric-tile">
            <p className="metric-label">Total Winnings</p>
            <p className="metric-value">{formatMoney(winningsOverview.totalWinnings)}</p>
            <p className="metric-sub">{winningsOverview.winningMonths} winning months</p>
          </article>
        </section>

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
            <button
              type="button"
              onClick={() => {
                if (!handleAction("manage subscription")) return;
                navigate("/subscription");
              }}
              className="inline-link-btn"
              style={{ cursor: "pointer" }}
            >
              Manage Subscription
            </button>
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
            <button
              type="button"
              onClick={() => {
                if (!handleAction("update charity")) return;
                navigate("/charities");
              }}
              className="inline-link-btn"
              style={{ cursor: "pointer" }}
            >
              Update Charity Selection
            </button>
            {user?.role === "admin" && !isGuest ? (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="inline-link-btn"
                style={{ cursor: "pointer" }}
              >
                Open Admin Panel
              </button>
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
                    disabled={isGuest}
                    required
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={scoreDate}
                    onChange={(event) => setScoreDate(event.target.value)}
                    disabled={isGuest}
                    required
                  />
                </label>
              </div>
              <button type="submit" disabled={savingScore || isGuest}>
                {savingScore ? "Saving..." : isGuest ? "Sign In to Add Score" : "Add Score"}
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
              <strong>Total Winnings:</strong> {formatMoney(winningsOverview.totalWinnings)}
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
            <button
              type="button"
              onClick={() => {
                if (!handleAction("view draw details")) return;
                navigate("/draw-results");
              }}
              className="inline-link-btn"
              style={{ cursor: "pointer" }}
            >
              View Latest Draw Details
            </button>
          </section>

          <section className="dashboard-card dashboard-card-wide">
            <h2>Draw Participation History</h2>
            <div className="draw-history-list">
              {drawHistory.length ? (
                drawHistory.map((entry) => (
                  <article key={entry.monthKey || entry._id || `${entry.month || "unknown"}-${entry.createdAt || "entry"}`} className="draw-history-row">
                    <div>
                      <p className="draw-history-title">{entry.monthKey || entry.month || "Draw result"}</p>
                      <p className="switch-text">Draw numbers: {(entry.drawNumbers || []).join(", ") || "-"}</p>
                    </div>
                    <div className="draw-history-stats">
                      <span className={entry.participated ? "status-pill active" : "status-pill inactive"}>
                        {entry.participated ? "Participated" : "No Entry"}
                      </span>
                      <span>Matches: {entry.matchCount || 0}</span>
                      <span>Winnings: {formatMoney(Number(entry.winnings || 0))}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="subtext">No draw history available yet.</p>
              )}
            </div>
          </section>
        </div>

        {showLoginModal && (
          <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Sign In Required</h2>
              <p>To perform this action, please sign in to your account.</p>
              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="primary-btn"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="secondary-btn"
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="secondary-btn"
                  style={{ marginLeft: "auto" }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
