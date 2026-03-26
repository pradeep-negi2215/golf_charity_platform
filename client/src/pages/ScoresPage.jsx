import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { scoresApi } from "../services/api";

const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

function ScoresPage() {
  const [scoreValue, setScoreValue] = useState("");
  const [scoreDate, setScoreDate] = useState(toDateInputValue());
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadScores = async () => {
      try {
        const response = await scoresApi.list();
        if (isMounted) {
          setScores(response.data.scores || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Unable to load scores");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadScores();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!localStorage.getItem("authToken")) {
    return <Navigate to="/login" replace />;
  }

  const latestScore = useMemo(() => {
    if (!scores.length) {
      return null;
    }

    return scores[0];
  }, [scores]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const numericValue = Number(scoreValue);
    if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 45) {
      setError("Score value must be between 1 and 45");
      return;
    }

    if (!scoreDate) {
      setError("Score date is required");
      return;
    }

    setSaving(true);

    try {
      const response = await scoresApi.add({
        value: numericValue,
        date: scoreDate
      });

      setScores(response.data.scores || []);
      setScoreValue("");
      setMessage("Score saved. Only the latest 5 scores are kept.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save score");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <h1>Score Management</h1>
        <p className="subtext">Add golf scores and keep your latest 5 rounds.</p>

        <form onSubmit={handleSubmit} className="score-form">
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

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add Score"}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}

        <div className="status-panel">
          <p>
            <strong>Total Stored:</strong> {scores.length} / 5
          </p>
          <p>
            <strong>Latest Score:</strong> {latestScore ? `${latestScore.value} on ${formatDate(latestScore.date)}` : "none"}
          </p>
        </div>

        {loading ? (
          <p>Loading scores...</p>
        ) : (
          <div className="scores-list">
            {scores.length ? (
              scores.map((score) => (
                <article key={score._id} className="score-row">
                  <span className="score-value">{score.value}</span>
                  <span className="score-date">{formatDate(score.date)}</span>
                </article>
              ))
            ) : (
              <p className="subtext">No scores yet. Add your first score above.</p>
            )}
          </div>
        )}

        <p className="switch-text">
          Back to <Link to="/dashboard">dashboard</Link>
        </p>
      </section>
    </div>
  );
}

export default ScoresPage;
