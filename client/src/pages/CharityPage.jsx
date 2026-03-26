import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { authApi, charityApi, userApi } from "../services/api";

function CharityPage() {
  const [charities, setCharities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedCharityId, setSelectedCharityId] = useState("");
  const [donationPercentage, setDonationPercentage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [charitiesResponse, meResponse] = await Promise.all([
          charityApi.list({ status: "active" }),
          authApi.me()
        ]);

        if (!isMounted) {
          return;
        }

        const list = charitiesResponse.data || [];
        setCharities(list);
        setSelectedCharityId(meResponse.data.user?.selectedCharity?._id || meResponse.data.user?.selectedCharity || "");
        setDonationPercentage(Number(meResponse.data.user?.donationPercentage ?? 10));
        setCategories(
          Array.from(new Set(list.map((item) => item.category).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b)
          )
        );
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Unable to load charities");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCharities = useMemo(() => {
    return charities.filter((charity) => {
      const matchesCategory = category === "all" || charity.category === category;
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        charity.name?.toLowerCase().includes(term) ||
        charity.description?.toLowerCase().includes(term) ||
        charity.country?.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [category, charities, search]);

  const saveSelection = async () => {
    setError("");
    setSuccess("");

    if (!selectedCharityId) {
      setError("Please choose a charity before saving");
      return;
    }

    if (Number(donationPercentage) < 10) {
      setError("Donation percentage must be at least 10%");
      return;
    }

    setIsSaving(true);
    try {
      const response = await userApi.updateMyCharity({
        charityId: selectedCharityId,
        donationPercentage: Number(donationPercentage)
      });

      localStorage.setItem("authUser", JSON.stringify(response.data.user));
      setSuccess("Charity preferences updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save charity preference");
    } finally {
      setIsSaving(false);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <h1>Choose Your Charity</h1>
        <p className="subtext">Search and filter active charities, then save your donation preference.</p>

        <div className="grid-two">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, description, country"
            />
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Donation Percentage (%)
          <input
            type="number"
            min="10"
            max="100"
            value={donationPercentage}
            onChange={(event) => setDonationPercentage(event.target.value)}
          />
        </label>

        {isLoading ? <p className="switch-text">Loading charities...</p> : null}

        <div className="charity-list">
          {filteredCharities.map((charity) => (
            <label key={charity._id} className="charity-card">
              <input
                type="radio"
                name="selectedCharity"
                checked={selectedCharityId === charity._id}
                onChange={() => setSelectedCharityId(charity._id)}
              />
              <div>
                <p className="charity-name">{charity.name}</p>
                <p className="switch-text">{charity.description || "No description provided."}</p>
                <p className="charity-meta">
                  {charity.category || "general"} | {charity.country || "UK"}
                </p>
              </div>
            </label>
          ))}
          {!isLoading && filteredCharities.length === 0 ? (
            <p className="switch-text">No charities match your search.</p>
          ) : null}
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        <div className="action-row">
          <button type="button" className="cta-btn" onClick={saveSelection} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save Charity Preference"}
          </button>
          <Link to="/dashboard" className="inline-link-btn">
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}

export default CharityPage;
