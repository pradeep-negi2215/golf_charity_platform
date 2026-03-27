import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.forgotPassword({ email });
      setSuccess(response.data?.message || "If that account exists, a password reset link has been sent.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send reset link");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Forgot Password</h1>
        <p className="subtext">Enter your email to receive a reset link for your member or admin account.</p>

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

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        <button type="submit" className="cta-btn" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>

        <p className="switch-text">
          Back to <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
