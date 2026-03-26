import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { subscriptionApi } from "../services/api";

const PLAN_OPTIONS = [
  { value: "monthly", label: "Monthly Plan", amount: 19.99 },
  { value: "yearly", label: "Yearly Plan", amount: 199.99 }
];

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const calculateDaysRemaining = (value) => {
  if (!value) {
    return 0;
  }

  const now = new Date();
  const endDate = new Date(value);
  const delta = endDate.getTime() - now.getTime();

  if (delta <= 0) {
    return 0;
  }

  return Math.ceil(delta / (1000 * 60 * 60 * 24));
};

function SubscriptionPage() {
  const [planType, setPlanType] = useState("monthly");
  const [statusData, setStatusData] = useState(null);
  const [toast, setToast] = useState({
    type: "",
    text: ""
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    description: "",
    action: null
  });
  const modalCardRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const navigate = useNavigate();

  const showToast = (type, text) => {
    setToast({ type, text });
  };

  const closeConfirm = () => {
    setConfirmState({
      isOpen: false,
      title: "",
      description: "",
      action: null
    });
  };

  const openConfirm = (title, description, action) => {
    setConfirmState({
      isOpen: true,
      title,
      description,
      action
    });
  };

  useEffect(() => {
    if (!toast.text) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setToast({ type: "", text: "" });
    }, 3200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [toast]);

  useEffect(() => {
    if (!confirmState.isOpen) {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
      return undefined;
    }

    previousFocusRef.current = document.activeElement;
    confirmBtnRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeConfirm();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const modalNode = modalCardRef.current;
      if (!modalNode) {
        return;
      }

      const focusable = modalNode.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const focusableArray = Array.from(focusable).filter((node) => !node.hasAttribute("disabled"));

      if (!focusableArray.length) {
        return;
      }

      const first = focusableArray[0];
      const last = focusableArray[focusableArray.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmState.isOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const response = await subscriptionApi.getStatus();
        if (!isMounted) {
          return;
        }

        setStatusData(response.data);
        if (response.data.planType) {
          setPlanType(response.data.planType);
        }
      } catch (requestError) {
        if (isMounted) {
          showToast("error", requestError.response?.data?.message || "Unable to load subscription status");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!localStorage.getItem("authToken")) {
    return <Navigate to="/login" replace />;
  }

  const selectedPlan = PLAN_OPTIONS.find((option) => option.value === planType) || PLAN_OPTIONS[0];
  const hasActivePlan = Boolean(statusData?.isActive);
  const currentPlanType = statusData?.planType || null;
  const hasSameActivePlan = hasActivePlan && currentPlanType === planType;

  const planActionLabel = (() => {
    if (!hasActivePlan) {
      return "Activate Plan";
    }

    if (hasSameActivePlan) {
      return "Already Active";
    }

    if (currentPlanType === "monthly" && planType === "yearly") {
      return "Upgrade to Yearly";
    }

    if (currentPlanType === "yearly" && planType === "monthly") {
      return "Downgrade to Monthly";
    }

    return "Switch Plan";
  })();

  const planSwitchNotice = (() => {
    if (!hasActivePlan || hasSameActivePlan) {
      return "";
    }

    if (currentPlanType === "monthly" && planType === "yearly") {
      return "Upgrade notice: yearly access starts immediately and remaining monthly value will be handled as proration by billing rules.";
    }

    if (currentPlanType === "yearly" && planType === "monthly") {
      return "Downgrade notice: monthly billing will begin on the next renewal window based on proration policy.";
    }

    return "Plan switch will follow account proration policy.";
  })();

  const daysRemaining = calculateDaysRemaining(statusData?.endAt);

  const refreshStatus = async () => {
    const response = await subscriptionApi.getStatus();
    setStatusData(response.data);
  };

  const activatePlan = async () => {
    setSubmitting(true);

    try {
      await subscriptionApi.create({
        planType,
        amount: selectedPlan.amount
      });
      await refreshStatus();
      showToast("success", "Subscription activated successfully.");
    } catch (requestError) {
      showToast("error", requestError.response?.data?.message || "Unable to activate subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const markInactive = async () => {
    setSubmitting(true);

    try {
      await subscriptionApi.updateStatus({ status: "inactive" });
      await refreshStatus();
      showToast("success", "Subscription marked as inactive.");
    } catch (requestError) {
      showToast("error", requestError.response?.data?.message || "Unable to update subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const onActivateClick = () => {
    if (hasSameActivePlan) {
      return;
    }

    if (!hasActivePlan) {
      activatePlan();
      return;
    }

    openConfirm(
      planActionLabel,
      planSwitchNotice || "Confirm plan change.",
      activatePlan
    );
  };

  const onMarkInactiveClick = () => {
    openConfirm(
      "Mark Subscription Inactive",
      "This will disable member-only features until an active plan is restored.",
      markInactive
    );
  };

  const executeConfirmAction = async () => {
    if (!confirmState.action) {
      closeConfirm();
      return;
    }

    closeConfirm();
    await confirmState.action();
  };

  const onOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      closeConfirm();
    }
  };

  if (loading) {
    return (
      <div className="auth-layout">
        <section className="auth-card">
          <p>Loading subscription details...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <section className="auth-card">
        <h1>Subscription</h1>
        <p className="subtext">Choose a monthly or yearly plan to unlock member-only features.</p>

        <div className="status-pill-row">
          <span className={statusData?.isActive ? "status-pill active" : "status-pill inactive"}>
            {statusData?.isActive ? "Active" : "Inactive"}
          </span>
          <span className="status-meta">
            Current plan: {statusData?.planType || "none"}
          </span>
        </div>

        <div className="status-panel">
          <p>
            <strong>Renews/Ends:</strong> {formatDate(statusData?.endAt)}
          </p>
          <p>
            <strong>Days Remaining:</strong> {daysRemaining}
          </p>
        </div>

        {planSwitchNotice ? <p className="notice-text">{planSwitchNotice}</p> : null}

        <div className="plan-grid">
          {PLAN_OPTIONS.map((option) => (
            <label key={option.value} className={planType === option.value ? "plan-card selected" : "plan-card"}>
              <input
                type="radio"
                name="planType"
                value={option.value}
                checked={planType === option.value}
                onChange={(event) => setPlanType(event.target.value)}
              />
              <span className="plan-title">{option.label}</span>
              <span className="plan-price">GBP {option.amount.toFixed(2)}</span>
              {hasActivePlan && currentPlanType === option.value ? (
                <span className="plan-note">Current active plan</span>
              ) : null}
            </label>
          ))}
        </div>

        <div className="action-row">
          <button type="button" className="cta-btn" onClick={onActivateClick} disabled={submitting || hasSameActivePlan}>
            {submitting ? "Saving..." : planActionLabel}
          </button>
          <button type="button" className="secondary-btn" onClick={onMarkInactiveClick} disabled={submitting}>
            Mark Inactive
          </button>
        </div>

        <p className="switch-text">
          Back to <Link to="/dashboard">dashboard</Link>
        </p>

        <button type="button" className="secondary-btn" onClick={() => navigate("/dashboard")}> 
          Return to Dashboard
        </button>

        {confirmState.isOpen ? (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onClick={onOverlayClick}
          >
            <div className="modal-card" ref={modalCardRef}>
              <h2 id="confirm-modal-title">{confirmState.title}</h2>
              <p>{confirmState.description}</p>
              <div className="action-row">
                <button type="button" onClick={executeConfirmAction} ref={confirmBtnRef}>
                  Confirm
                </button>
                <button type="button" className="secondary-btn" onClick={closeConfirm}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {toast.text ? (
          <div className={toast.type === "error" ? "toast toast-error" : "toast toast-success"} role="status" aria-live="polite">
            {toast.text}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default SubscriptionPage;
