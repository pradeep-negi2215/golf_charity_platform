import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LocationCurrencyPicker from "../components/LocationCurrencyPicker";
import { useLocationCurrency } from "../hooks/useLocationCurrency";
import { authApi } from "../services/api";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  handicap: 28,
  homeClub: ""
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

  return "";
};

const getRequestErrorMessage = (requestError, fallback) => {
  if (requestError.response?.data?.message) {
    return requestError.response.data.message;
  }

  if (requestError.code === "ERR_NETWORK") {
    return "Backend is unreachable or blocked by CORS. Please try again in a moment.";
  }

  return fallback;
};

function AdminSignupPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { selectedCountry, setSelectedCountry, countryOptions, currencyCode } = useLocationCurrency();

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
      const response = await authApi.registerAdmin({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        handicap: Number(form.handicap),
        homeClub: form.homeClub
      });

      localStorage.setItem("authToken", response.data.accessToken || response.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.user));
      const destination = response.data.user?.role === "admin" ? "/admin" : "/dashboard";
      navigate(destination);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Admin signup failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Admin Registration</h1>
        <p className="subtext">Create an admin account to manage the golf charity platform.</p>

        <LocationCurrencyPicker
          compact
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          countryOptions={countryOptions}
          currencyCode={currencyCode}
        />

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
            Handicap (optional)
            <input
              name="handicap"
              type="number"
              min="0"
              max="54"
              value={form.handicap}
              onChange={onChange}
            />
          </label>
          <label>
            Home Club (optional)
            <input name="homeClub" value={form.homeClub} onChange={onChange} />
          </label>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="cta-btn" disabled={isSubmitting}>
          {isSubmitting ? "Creating admin account..." : "Register as Admin"}
        </button>

        <p className="switch-text">
          Have a member account? <Link to="/login">Log in here</Link>
        </p>

        <p className="switch-text">
          New member? <Link to="/signup">Create a member account</Link>
        </p>
      </form>
    </div>
  );
}

export default AdminSignupPage;
