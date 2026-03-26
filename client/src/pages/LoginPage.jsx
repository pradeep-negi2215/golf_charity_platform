import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

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
      const response = await authApi.login({ email, password });
      localStorage.setItem("authToken", response.data.accessToken || response.data.token);
      localStorage.setItem("authUser", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Welcome Back</h1>
        <p className="subtext">Log in to track performance and charity impact.</p>

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

        <p className="switch-text">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
