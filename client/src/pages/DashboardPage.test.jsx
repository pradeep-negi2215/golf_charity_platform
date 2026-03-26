import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DashboardPage from "./DashboardPage";
import { authApi, drawsApi, scoresApi, subscriptionApi } from "../services/api";

const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock("../services/api", () => ({
  authApi: {
    me: vi.fn(),
    logout: vi.fn()
  },
  subscriptionApi: {
    getStatus: vi.fn()
  },
  scoresApi: {
    list: vi.fn(),
    add: vi.fn()
  },
  drawsApi: {
    getHistory: vi.fn()
  }
}));

const renderPage = () => {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
};

describe("DashboardPage", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "test-token");
    localStorage.setItem("authUser", JSON.stringify({ firstName: "Cached", lastName: "User" }));

    vi.clearAllMocks();
    navigateMock.mockReset();

    authApi.me.mockResolvedValue({
      data: {
        user: {
          _id: "u1",
          firstName: "Harper",
          lastName: "Lee",
          email: "harper@test.local",
          role: "member",
          selectedCharity: {
            _id: "c1",
            name: "Green Future",
            category: "environment"
          },
          donationPercentage: 15
        }
      }
    });

    subscriptionApi.getStatus.mockResolvedValue({
      data: {
        isActive: true,
        planType: "monthly",
        endAt: "2099-12-31T00:00:00.000Z"
      }
    });

    scoresApi.list.mockResolvedValue({
      data: {
        scores: [
          { _id: "s1", value: 14, date: "2026-03-20" },
          { _id: "s2", value: 20, date: "2026-03-10" }
        ]
      }
    });

    drawsApi.getHistory.mockResolvedValue({
      data: {
        history: [
          {
            monthKey: "2026-06",
            drawNumbers: [5, 10, 15, 20, 25],
            participated: true,
            matchCount: 4,
            winnings: 350
          },
          {
            monthKey: "2026-05",
            drawNumbers: [1, 2, 3, 4, 5],
            participated: false,
            matchCount: 0,
            winnings: 0
          }
        ]
      }
    });
  });

  test("renders full dashboard widgets with fetched data", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Member Dashboard")).toBeInTheDocument();
    });

    expect(screen.getByText("Subscription Status")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("monthly")).toBeInTheDocument();

    expect(screen.getByText("Charity Commitment")).toBeInTheDocument();
    expect(screen.getByText("Green Future")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();

    expect(screen.getByText("Score Entry and History")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();

    expect(screen.getByText("Winnings Overview")).toBeInTheDocument();
    expect(screen.getByText("GBP 350.00")).toBeInTheDocument();
    expect(screen.getByText("Winning Months:")).toBeInTheDocument();

    expect(screen.getByText("Draw Participation History")).toBeInTheDocument();
    expect(screen.getByText("2026-06")).toBeInTheDocument();
    expect(screen.getByText("Participated")).toBeInTheDocument();
  });

  test("submits new score and refreshes score history in dashboard", async () => {
    scoresApi.add.mockResolvedValue({
      data: {
        scores: [
          { _id: "s-new", value: 9, date: "2026-03-26" },
          { _id: "s1", value: 14, date: "2026-03-20" }
        ]
      }
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Member Dashboard")).toBeInTheDocument();
    });

    await userEvent.clear(screen.getByLabelText("Score (1-45)"));
    await userEvent.type(screen.getByLabelText("Score (1-45)"), "9");

    await userEvent.click(screen.getByRole("button", { name: "Add Score" }));

    await waitFor(() => {
      expect(scoresApi.add).toHaveBeenCalledWith({
        value: 9,
        date: expect.any(String)
      });
    });

    expect(screen.getByText("Score recorded successfully.")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  test("renders graceful empty states and zero winnings when history data is empty", async () => {
    scoresApi.list.mockResolvedValue({ data: { scores: [] } });
    drawsApi.getHistory.mockResolvedValue({ data: { history: [] } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Member Dashboard")).toBeInTheDocument();
    });

    expect(screen.getByText("No score history available yet.")).toBeInTheDocument();
    expect(screen.getByText("No draw history available yet.")).toBeInTheDocument();
    expect(screen.getByText("GBP 0.00")).toBeInTheDocument();
    expect(screen.getByText("Latest: No scores yet")).toBeInTheDocument();
  });

  test("blocks invalid score submission before API call", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Member Dashboard")).toBeInTheDocument();
    });

    await userEvent.clear(screen.getByLabelText("Score (1-45)"));
    await userEvent.type(screen.getByLabelText("Score (1-45)"), "99");
    await userEvent.click(screen.getByRole("button", { name: "Add Score" }));

    expect(scoresApi.add).not.toHaveBeenCalled();
    expect(screen.getByText("Score must be between 1 and 45")).toBeInTheDocument();
  });

  test("logs out user, clears storage, and redirects to login", async () => {
    authApi.logout.mockResolvedValue({ data: { message: "Logged out" } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Member Dashboard")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem("authToken")).toBeNull();
      expect(localStorage.getItem("authUser")).toBeNull();
      expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
    });
  });

  test("renders responsive dashboard structure classes", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Member Dashboard")).toBeInTheDocument();
    });

    expect(document.querySelector(".dashboard-shell")).toBeInTheDocument();
    expect(document.querySelector(".dashboard-grid")).toBeInTheDocument();
    expect(document.querySelectorAll(".dashboard-card").length).toBeGreaterThanOrEqual(5);
    expect(document.querySelectorAll(".dashboard-card-wide").length).toBe(2);
  });
});
