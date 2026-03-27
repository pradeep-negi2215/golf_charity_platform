import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LocationCurrencyPicker from "../components/LocationCurrencyPicker";
import { useLocationCurrency } from "../hooks/useLocationCurrency";
import { authApi } from "../services/api";

const validateForm = (email, password) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email address";
  }

  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
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

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const navigate = useNavigate();
  const { selectedCountry, setSelectedCountry, countryOptions, currencyCode } = useLocationCurrency();

  const loginAsGuest = async () => {
    setError("");
    setIsGuestLoading(true);

    try {
      const response = await authApi.guestLogin();
      localStorage.setItem("authToken", response.data.accessToken || response.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.user));
      localStorage.setItem("isGuest", "true");
      navigate("/dashboard");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Unable to start guest preview"));
    } finally {
      setIsGuestLoading(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm(email, password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const demoAdminEmails = JSON.parse(localStorage.getItem("demoAdminEmails") || "[]");
      const shouldLoginAsAdmin = demoAdminEmails.includes(email.toLowerCase().trim());

      const response = await authApi.login({
        email,
        password,
        asAdmin: shouldLoginAsAdmin
      });
      localStorage.setItem("authToken", response.data.accessToken || response.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.user));
      const destination = response.data.user?.role === "admin" ? "/admin" : "/dashboard";
      navigate(destination);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "Login failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Welcome Back</h1>
        <p className="subtext">Log in to track performance and charity impact.</p>

        <LocationCurrencyPicker
          compact
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          countryOptions={countryOptions}
          currencyCode={currencyCode}
        />

        <label>
          Email
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="cta-btn" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Log in"}
        </button>

        <p className="switch-text" style={{ marginTop: "6px", textAlign: "center" }}>
          Forgot password? <Link to="/forgot-password">Reset by email</Link>
        </p>

        <p className="switch-text" style={{ marginTop: "4px", textAlign: "center" }}>
          Admin? <Link to="/admin">Go to Admin Panel</Link> or <Link to="/admin-signup">Register as Admin</Link>
        </p>

        <button type="button" className="secondary-btn guest-preview-btn" onClick={loginAsGuest} disabled={isGuestLoading}>
          {isGuestLoading ? "Opening preview..." : "Continue as Guest Preview"}
        </button>

        <p className="switch-text">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
