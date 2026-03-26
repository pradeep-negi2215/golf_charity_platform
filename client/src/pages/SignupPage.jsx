import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, charityApi } from "../services/api";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  handicap: 28,
  homeClub: "",
  charityId: "",
  donationPercentage: 10
};

const validateForm = (form) => {
  if (!form.firstName.trim() || !form.lastName.trim()) {
    return "First name and last name are required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return "Please enter a valid email address";
  }

  if (form.password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (Number(form.handicap) < 0 || Number(form.handicap) > 54) {
    return "Handicap must be between 0 and 54";
  }

  if (!form.charityId) {
    return "Please select a charity";
  }

  if (Number(form.donationPercentage) < 10) {
    return "Donation percentage must be at least 10%";
  }

  return "";
};

function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [charities, setCharities] = useState([]);
  const [charitySearch, setCharitySearch] = useState("");
  const [charityCategory, setCharityCategory] = useState("all");
  const [charityLoading, setCharityLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const loadCharities = async () => {
      setCharityLoading(true);

      try {
        const response = await charityApi.list({ status: "active" });
        if (isMounted) {
          setCharities(response.data || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || "Unable to load charities");
        }
      } finally {
        if (isMounted) {
          setCharityLoading(false);
        }
      }
    };

    loadCharities();

    return () => {
      isMounted = false;
    };
  }, []);

  const charityCategories = useMemo(() => {
    return Array.from(new Set(charities.map((item) => item.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [charities]);

  const filteredCharities = useMemo(() => {
    return charities.filter((charity) => {
      const matchesCategory = charityCategory === "all" || charity.category === charityCategory;
      const term = charitySearch.trim().toLowerCase();
      const matchesSearch =
        !term ||
        charity.name?.toLowerCase().includes(term) ||
        charity.description?.toLowerCase().includes(term) ||
        charity.country?.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [charities, charityCategory, charitySearch]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.register({
        ...form,
        handicap: Number(form.handicap),
        donationPercentage: Number(form.donationPercentage)
      });

      localStorage.setItem("authToken", response.data.accessToken || response.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Create Account</h1>
        <p className="subtext">Join the golf charity subscription platform.</p>

        <div className="grid-two">
          <label>
            First Name
            <input name="firstName" value={form.firstName} onChange={onChange} required />
          </label>
          <label>
            Last Name
            <input name="lastName" value={form.lastName} onChange={onChange} required />
          </label>
        </div>

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onChange} required />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            minLength={8}
            required
          />
        </label>

        <div className="grid-two">
          <label>
            Handicap
            <input
              name="handicap"
              type="number"
              min="0"
              max="54"
              value={form.handicap}
              onChange={onChange}
              required
            />
          </label>
          <label>
            Home Club
            <input name="homeClub" value={form.homeClub} onChange={onChange} />
          </label>
        </div>

        <div className="grid-two">
          <label>
            Find Charity
            <input
              value={charitySearch}
              onChange={(event) => setCharitySearch(event.target.value)}
              placeholder="Search name, description, country"
            />
          </label>
          <label>
            Charity Category
            <select value={charityCategory} onChange={(event) => setCharityCategory(event.target.value)}>
              <option value="all">All categories</option>
              {charityCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Select Charity
          <select name="charityId" value={form.charityId} onChange={onChange} required>
            <option value="">Select an active charity</option>
            {filteredCharities.map((charity) => (
              <option key={charity._id} value={charity._id}>
                {charity.name} ({charity.category || "general"} - {charity.country || "UK"})
              </option>
            ))}
          </select>
        </label>

        <label>
          Donation Percentage (%)
          <input
            name="donationPercentage"
            type="number"
            min="10"
            max="100"
            value={form.donationPercentage}
            onChange={onChange}
            required
          />
        </label>

        {charityLoading ? <p className="switch-text">Loading charities...</p> : null}

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="cta-btn" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>

        <p className="switch-text">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default SignupPage;
