import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import LocationCurrencyPicker from "../components/LocationCurrencyPicker";
import { useLocationCurrency } from "../hooks/useLocationCurrency";
import { adminApi, authApi, charityApi, drawsApi } from "../services/api";

const SECTIONS = [
  { key: "users", label: "Users" },
  { key: "scores", label: "Scores" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "draw", label: "Draw & Payouts" },
  { key: "charities", label: "Charities" }
];

function AdminPage() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("users");
  const [users, setUsers] = useState([]);
  const [scores, setScores] = useState([]);
  const [scoreDrafts, setScoreDrafts] = useState({});
  const [subscriptions, setSubscriptions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [selectedDrawId, setSelectedDrawId] = useState("");
  const [drawWinners, setDrawWinners] = useState(null);
  const [charities, setCharities] = useState([]);
  const [runMonthKey, setRunMonthKey] = useState("");
  const [charityForm, setCharityForm] = useState({
    name: "",
    description: "",
    category: "",
    country: "UK",
    status: "active"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { selectedCountry, setSelectedCountry, countryOptions, currencyCode, formatMoney } = useLocationCurrency();

  const token = localStorage.getItem("authToken");

  const loadAll = async () => {
    setError("");
    try {
      const [meRes, usersRes, scoresRes, subsRes, drawsRes, charitiesRes] = await Promise.all([
        authApi.me(),
        adminApi.users.list(),
        adminApi.scores.list(),
        adminApi.subscriptions.list(),
        adminApi.draws.list(),
        adminApi.charities.list()
      ]);

      setUser(meRes.data.user);
      setUsers(usersRes.data.users || []);
      setScores(scoresRes.data.scores || []);
      setSubscriptions(subsRes.data.subscriptions || []);
      setDraws(drawsRes.data.draws || []);
      setCharities(charitiesRes.data.charities || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load admin panel data");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      await loadAll();
      if (isMounted) {
        setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedDrawId) {
      setDrawWinners(null);
      return;
    }

    let isMounted = true;

    const loadWinners = async () => {
      try {
        const response = await adminApi.draws.winners(selectedDrawId);
        if (isMounted) {
          setDrawWinners(response.data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Unable to load winners");
        }
      }
    };

    loadWinners();

    return () => {
      isMounted = false;
    };
  }, [selectedDrawId]);

  const isAdmin = user?.role === "admin";

  const setFeedback = (message) => {
    setSuccess(message);
    setError("");
  };

  const updateUserRole = async (id, role) => {
    setSaving(true);
    try {
      await adminApi.users.update(id, { role });
      await loadAll();
      setFeedback("User updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update user");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id) => {
    setSaving(true);
    try {
      await adminApi.users.remove(id);
      await loadAll();
      setFeedback("User deleted.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete user");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const updateScore = async (id, value) => {
    setSaving(true);
    try {
      await adminApi.scores.update(id, { value: Number(value) });
      await loadAll();
      setFeedback("Score updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update score");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const updateCharityStatus = async (id, status) => {
    setSaving(true);
    try {
      await charityApi.update(id, { status });
      await loadAll();
      setFeedback("Charity updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update charity");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const updateSubscriptionStatus = async (id, status) => {
    setSaving(true);
    try {
      await adminApi.subscriptions.update(id, { status });
      await loadAll();
      setFeedback("Subscription updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update subscription");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const runDraw = async () => {
    setSaving(true);
    try {
      await drawsApi.runMonthly(runMonthKey ? { monthKey: runMonthKey } : {});
      await loadAll();
      setFeedback("Draw executed.");
      setRunMonthKey("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to run draw");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const markPayout = async (tier, winnerUserId, paidOut) => {
    if (!selectedDrawId) {
      return;
    }

    setSaving(true);
    try {
      await adminApi.draws.markPayout(selectedDrawId, tier, winnerUserId, {
        paidOut,
        payoutReference: paidOut ? `MANUAL-${Date.now()}` : ""
      });

      const winnersRes = await adminApi.draws.winners(selectedDrawId);
      setDrawWinners(winnersRes.data);
      setFeedback(paidOut ? "Payout marked." : "Payout reset.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to mark payout");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const createCharity = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await charityApi.create(charityForm);
      await loadAll();
      setFeedback("Charity created.");
      setCharityForm({
        name: "",
        description: "",
        category: "",
        country: "UK",
        status: "active"
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create charity");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const removeCharity = async (id) => {
    setSaving(true);
    try {
      await charityApi.remove(id);
      await loadAll();
      setFeedback("Charity deleted.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete charity");
      setSuccess("");
    } finally {
      setSaving(false);
    }
  };

  const payoutsSummary = useMemo(() => {
    if (!drawWinners?.winners) {
      return { total: 0, paid: 0 };
    }

    const all = [
      ...(drawWinners.winners.match3 || []),
      ...(drawWinners.winners.match4 || []),
      ...(drawWinners.winners.match5 || [])
    ];

    return {
      total: all.length,
      paid: all.filter((item) => item.paidOut).length
    };
  }, [drawWinners]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="auth-layout">
        <section className="auth-card">
          <p>Loading admin panel...</p>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="auth-layout">
        <section className="auth-card">
          <h1>Access Denied</h1>
          <p className="subtext">Admin role is required to view this page.</p>
          <p className="switch-text">
            Return to <Link to="/dashboard">dashboard</Link>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <section className="admin-shell">
        <header className="admin-hero">
          <div>
            <h1>Admin Panel</h1>
            <p className="subtext">Role-based control center for users, scores, subscriptions, draws, payouts, and charities.</p>
          </div>
          <Link to="/dashboard" className="inline-link-btn">
            Back to Dashboard
          </Link>
        </header>

        <nav className="admin-tabs">
          {SECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeSection === item.key ? "admin-tab active" : "admin-tab"}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        {activeSection === "users" ? (
          <section className="admin-card">
            <h2>View & Manage Users</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.firstName} {entry.lastName}</td>
                      <td>{entry.email}</td>
                      <td>
                        <select
                          defaultValue={entry.role}
                          onChange={(event) => updateUserRole(entry._id, event.target.value)}
                          disabled={saving}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <button type="button" className="danger-btn" onClick={() => deleteUser(entry._id)} disabled={saving}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === "scores" ? (
          <section className="admin-card">
            <h2>Edit Scores</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Score</th>
                    <th>Date</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.userId?.email || "-"}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          max="45"
                          value={scoreDrafts[entry._id] ?? entry.value}
                          onChange={(event) =>
                            setScoreDrafts((prev) => ({
                              ...prev,
                              [entry._id]: event.target.value
                            }))
                          }
                        />
                      </td>
                      <td>{new Date(entry.date).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => updateScore(entry._id, scoreDrafts[entry._id] ?? entry.value)}
                          disabled={saving}
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === "subscriptions" ? (
          <section className="admin-card">
            <h2>Manage Subscriptions</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.userId?.email || "-"}</td>
                      <td>{entry.billingCycle}</td>
                      <td>{entry.status}</td>
                      <td className="action-row">
                        <button type="button" onClick={() => updateSubscriptionStatus(entry._id, "active")} disabled={saving}>
                          Activate
                        </button>
                        <button type="button" className="secondary-btn" onClick={() => updateSubscriptionStatus(entry._id, "inactive")} disabled={saving}>
                          Inactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === "draw" ? (
          <section className="admin-card">
            <h2>Create & Run Draw / Verify Payouts</h2>
            <LocationCurrencyPicker
              compact
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              countryOptions={countryOptions}
              currencyCode={currencyCode}
            />
            <div className="grid-two">
              <label>
                Run Draw Month Key (optional, YYYY-MM)
                <input
                  value={runMonthKey}
                  onChange={(event) => setRunMonthKey(event.target.value)}
                  placeholder="2026-12"
                />
              </label>
              <label>
                Select Existing Draw
                <select value={selectedDrawId} onChange={(event) => setSelectedDrawId(event.target.value)}>
                  <option value="">Choose draw</option>
                  {draws.map((entry) => (
                    <option key={entry._id} value={entry._id}>
                      {entry.monthKey} ({new Date(entry.ranAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="action-row">
              <button type="button" onClick={runDraw} disabled={saving}>
                Run Draw
              </button>
            </div>

            {drawWinners ? (
              <div className="status-panel">
                <p>
                  <strong>Draw:</strong> {drawWinners.monthKey}
                </p>
                <p>
                  <strong>Payout Progress:</strong> {payoutsSummary.paid} / {payoutsSummary.total}
                </p>

                {VALID_TIERS.map((tier) => (
                  <div key={tier} className="admin-tier-block">
                    <p>
                      <strong>{tier}</strong>
                    </p>
                    {(drawWinners.winners?.[tier] || []).length ? (
                      (drawWinners.winners[tier] || []).map((winner) => (
                        <div key={`${tier}-${winner.userId?._id || winner.userId}`} className="admin-inline-row">
                          <span>{winner.userId?.email || winner.userId?.firstName || "winner"}</span>
                          <span>{formatMoney(winner.winnings || 0)}</span>
                          <span>{winner.paidOut ? "Paid" : "Pending"}</span>
                          <button
                            type="button"
                            onClick={() =>
                              markPayout(
                                tier,
                                (winner.userId?._id || winner.userId).toString(),
                                !winner.paidOut
                              )
                            }
                            disabled={saving}
                          >
                            {winner.paidOut ? "Reset" : "Mark Paid"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="switch-text">No winners.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === "charities" ? (
          <section className="admin-card">
            <h2>Manage Charities</h2>

            <form onSubmit={createCharity} className="admin-form-grid">
              <input
                placeholder="Name"
                value={charityForm.name}
                onChange={(event) => setCharityForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <input
                placeholder="Category"
                value={charityForm.category}
                onChange={(event) => setCharityForm((prev) => ({ ...prev, category: event.target.value }))}
              />
              <input
                placeholder="Country"
                value={charityForm.country}
                onChange={(event) => setCharityForm((prev) => ({ ...prev, country: event.target.value }))}
              />
              <select
                value={charityForm.status}
                onChange={(event) => setCharityForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
              <input
                className="admin-wide-input"
                placeholder="Description"
                value={charityForm.description}
                onChange={(event) => setCharityForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <button type="submit" disabled={saving}>Create Charity</button>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {charities.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.name}</td>
                      <td>{entry.category || "-"}</td>
                      <td>{entry.status}</td>
                      <td className="action-row">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => updateCharityStatus(entry._id, entry.status === "active" ? "inactive" : "active")}
                          disabled={saving}
                        >
                          {entry.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="danger-btn" onClick={() => removeCharity(entry._id)} disabled={saving}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}

const VALID_TIERS = ["match3", "match4", "match5"];

export default AdminPage;
