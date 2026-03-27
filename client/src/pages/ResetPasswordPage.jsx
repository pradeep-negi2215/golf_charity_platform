import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";

function ResetPasswordPage() {
  const queryToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token") || "";
  }, []);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!queryToken) {
      setError("Reset token is missing or invalid");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.resetPassword({
        token: queryToken,
        newPassword
      });

      setSuccess(response.data?.message || "Password has been reset. You can now log in.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>Reset Password</h1>
        <p className="subtext">Set a new password for your account.</p>

        <label>
          New Password
          <input
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        <label>
          Confirm New Password
          <input
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        <button type="submit" className="cta-btn" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Reset password"}
        </button>

        <p className="switch-text">
          Back to <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
