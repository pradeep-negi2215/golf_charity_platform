import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";

function LandingPage() {
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);
  const [guestError, setGuestError] = useState("");
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    setGuestError("");
    setIsLoadingGuest(true);

    try {
      // Guest mode: navigate directly to dashboard
      // No auth token needed - dashboard will detect guest mode
      navigate("/dashboard");
    } catch (error) {
      setGuestError("Unable to load guest view");
    } finally {
      setIsLoadingGuest(false);
    }
  };

  return (
    <div className="landing-layout">
      <div className="landing-container">
        <header className="landing-nav">
          <p className="landing-logo">GOLF CHARITY CLUB</p>
          <nav className="landing-nav-links" aria-label="Landing navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#start">Start</a>
          </nav>
          <div className="landing-nav-actions">
            <Link to="/login" className="inline-link-btn">
              Sign In
            </Link>
          </div>
        </header>

        <section className="landing-hero">
          <div className="hero-content">
            <p className="hero-badge">Monthly draws. Real impact. Better golf consistency.</p>
            <h1 className="hero-title">
              Play Better, <span>Give Bigger</span>
            </h1>
            <p className="hero-subtitle">
              Join a golf subscription community where every round can fund change. Track scores,
              enter monthly draws, and support verified charities with every plan.
            </p>

            <div className="hero-stats">
              <div className="stat-card">
                <p className="stat-value">1000+</p>
                <p className="stat-label">Active Members</p>
              </div>
              <div className="stat-card">
                <p className="stat-value">$500K+</p>
                <p className="stat-label">Raised for Charity</p>
              </div>
              <div className="stat-card">
                <p className="stat-value">Monthly</p>
                <p className="stat-label">Prize Draws</p>
              </div>
            </div>

            <div className="hero-cta">
              <Link to="/signup" className="cta-btn hero-signup-btn">
                Join Now
              </Link>
              <button
                onClick={handleGuestLogin}
                disabled={isLoadingGuest}
                className="guest-btn"
              >
                {isLoadingGuest ? "Loading..." : "Explore as Guest"}
              </button>
            </div>

            {guestError && (
              <p className="error-text" style={{ marginTop: "12px", textAlign: "center" }}>
                {guestError}
              </p>
            )}

            <div className="hero-trust-strip">
              <span>Verified charities</span>
              <span>Transparent contribution logs</span>
              <span>Member-first monthly prizes</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-icon">⛳</div>
              <p>Compete</p>
            </div>
            <div className="visual-card">
              <div className="visual-icon">🎯</div>
              <p>Win</p>
            </div>
            <div className="visual-card">
              <div className="visual-icon">❤️</div>
              <p>Give Back</p>
            </div>
          </div>
        </section>

        <section id="features" className="landing-features">
          <h2>Why Join Us?</h2>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <h3>Score Tracking</h3>
              <p>Track your latest golf scores and see how you rank among members.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🏆</div>
              <h3>Monthly Draws</h3>
              <p>Monthly prize draws with dynamic pools based on subscription amounts.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🤝</div>
              <h3>Charity Support</h3>
              <p>Choose your favorite charity and 10% of subscriptions support your cause.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💎</div>
              <h3>Premium Plans</h3>
              <p>Flexible monthly or yearly subscription plans tailored to your needs.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="landing-process">
          <h2>How It Works</h2>
          <div className="process-grid">
            <article className="process-step">
              <p className="process-index">01</p>
              <h3>Create Profile</h3>
              <p>Set your handicap, choose a charity, and pick a monthly or yearly plan.</p>
            </article>
            <article className="process-step">
              <p className="process-index">02</p>
              <h3>Track Scores</h3>
              <p>Log rounds quickly and keep your recent form visible in one place.</p>
            </article>
            <article className="process-step">
              <p className="process-index">03</p>
              <h3>Win and Contribute</h3>
              <p>Enter draw cycles automatically while part of each subscription supports your cause.</p>
            </article>
          </div>
        </section>

        <section id="start" className="landing-footer">
          <p>Ready to join the next monthly draw?</p>
          <div className="hero-cta">
            <Link to="/signup" className="cta-btn hero-signup-btn">
              Create Account
            </Link>
            <Link to="/login" className="inline-link-btn">
              I already have an account
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LandingPage;
