import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import LocationCurrencyPicker from "../components/LocationCurrencyPicker";
import { useLocationCurrency } from "../hooks/useLocationCurrency";
import { authApi, drawsApi } from "../services/api";

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
};

const WinnerGroup = ({ title, winners, formatMoney }) => {
  return (
    <section className="status-panel">
      <p>
        <strong>{title}</strong>
      </p>
      {winners.length ? (
        <div className="scores-list">
          {winners.map((winner, index) => (
            <article key={`${winner.userId}-${index}`} className="score-row">
              <span>{winner.name || winner.email || winner.userId}</span>
              <span>
                {winner.matchedNumbers.length} matches | {formatMoney(winner.winnings || 0)}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <p className="subtext">No winners in this category.</p>
      )}
    </section>
  );
};

function DrawResultsPage() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  });
  const [draw, setDraw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningDraw, setRunningDraw] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { selectedCountry, setSelectedCountry, countryOptions, currencyCode, formatMoney } = useLocationCurrency();

  const loadDraw = async () => {
    const response = await drawsApi.getLatest();
    setDraw(response.data.draw);
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [meResponse, drawResponse] = await Promise.all([authApi.me(), drawsApi.getLatest()]);

        if (!isMounted) {
          return;
        }

        setUser(meResponse.data.user);
        setDraw(drawResponse.data.draw);
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Unable to load draw results");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!localStorage.getItem("authToken")) {
    return <Navigate to="/login" replace />;
  }

  const runDraw = async () => {
    setRunningDraw(true);
    setError("");
    setMessage("");

    try {
      await drawsApi.runMonthly();
      await loadDraw();
      setMessage("Monthly draw generated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to run monthly draw");
    } finally {
      setRunningDraw(false);
    }
  };

  const drawNumbersText = useMemo(() => {
    if (!draw?.drawNumbers?.length) {
      return "-";
    }

    return draw.drawNumbers.join(", ");
  }, [draw]);

  if (loading) {
    return (
      <div className="auth-layout">
        <section className="auth-card">
          <p>Loading monthly draw...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <h1>Monthly Draw Results</h1>
        <p className="subtext">View draw numbers, winner tiers, and your participation status.</p>

        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}

        <LocationCurrencyPicker
          compact
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          countryOptions={countryOptions}
          currencyCode={currencyCode}
        />

        {user?.role === "admin" ? (
          <button type="button" onClick={runDraw} disabled={runningDraw}>
            {runningDraw ? "Running draw..." : "Run Monthly Draw"}
          </button>
        ) : null}

        {draw ? (
          <>
            <div className="status-panel">
              <p>
                <strong>Month:</strong> {draw.monthKey}
              </p>
              <p>
                <strong>Draw Date:</strong> {formatDateTime(draw.ranAt)}
              </p>
              <p>
                <strong>Draw Numbers:</strong> {drawNumbersText}
              </p>
              <p>
                <strong>Participants:</strong> {draw.participantCount}
              </p>
            </div>

            <div className="status-panel">
              <p>
                <strong>Total Subscription Pool:</strong> {formatMoney(draw.prizePool?.totalSubscriptions ?? 0)}
              </p>
              <p>
                <strong>3-Match Pool (25%):</strong> {formatMoney(draw.prizePool?.pools?.match3 ?? 0)}
              </p>
              <p>
                <strong>4-Match Pool (35%):</strong> {formatMoney(draw.prizePool?.pools?.match4 ?? 0)}
              </p>
              <p>
                <strong>5-Match Pool (40% + rollover):</strong> {formatMoney(draw.prizePool?.pools?.match5 ?? 0)}
              </p>
              <p>
                <strong>Rollover In:</strong> {formatMoney(draw.prizePool?.rolloverIn ?? 0)}
              </p>
              <p>
                <strong>Rollover Out:</strong> {formatMoney(draw.prizePool?.rolloverOut ?? 0)}
              </p>
            </div>

            <div className="status-panel">
              <p>
                <strong>Your Participation:</strong>{" "}
                {draw.currentUser?.participated ? "Yes" : "No"}
              </p>
              <p>
                <strong>Your Matched Numbers:</strong>{" "}
                {draw.currentUser?.matchedNumbers?.length
                  ? draw.currentUser.matchedNumbers.join(", ")
                  : "none"}
              </p>
              <p>
                <strong>Your Winnings:</strong> {formatMoney(draw.currentUser?.winnings || 0)}
              </p>
            </div>

            <WinnerGroup title="3-Match Winners" winners={draw.winners?.match3 || []} formatMoney={formatMoney} />
            <WinnerGroup title="4-Match Winners" winners={draw.winners?.match4 || []} formatMoney={formatMoney} />
            <WinnerGroup title="5-Match Winners" winners={draw.winners?.match5 || []} formatMoney={formatMoney} />
          </>
        ) : (
          <p className="subtext">No monthly draw has been run yet.</p>
        )}

        <p className="switch-text">
          Back to <Link to="/dashboard">dashboard</Link>
        </p>
      </section>
    </div>
  );
}

export default DrawResultsPage;
