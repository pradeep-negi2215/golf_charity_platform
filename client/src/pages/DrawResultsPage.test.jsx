import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import DrawResultsPage from "./DrawResultsPage";
import { authApi, drawsApi } from "../services/api";

vi.mock("../services/api", () => ({
  authApi: {
    me: vi.fn()
  },
  drawsApi: {
    getLatest: vi.fn(),
    runMonthly: vi.fn()
  }
}));

const drawFixture = {
  monthKey: "2026-03",
  ranAt: "2026-03-31T12:00:00.000Z",
  drawNumbers: [5, 10, 15, 20, 25],
  participantCount: 12,
  winners: {
    match3: [{ userId: "u1", name: "Alice", matchedNumbers: [5, 10, 15], winnings: 25 }],
    match4: [{ userId: "u2", name: "Bob", matchedNumbers: [5, 10, 15, 20], winnings: 250 }],
    match5: [{ userId: "u3", name: "Chris", matchedNumbers: [5, 10, 15, 20, 25], winnings: 5000 }]
  },
  currentUser: {
    participated: true,
    matchedNumbers: [5, 10, 15],
    winnings: 25
  }
};

const renderPage = () => {
  return render(
    <MemoryRouter>
      <DrawResultsPage />
    </MemoryRouter>
  );
};

describe("DrawResultsPage", () => {
  beforeEach(() => {
    localStorage.setItem("authToken", "token");
    localStorage.setItem(
      "authUser",
      JSON.stringify({ firstName: "Test", lastName: "User", role: "member" })
    );

    vi.clearAllMocks();
  });

  test("renders latest draw and user participation for member", async () => {
    authApi.me.mockResolvedValue({
      data: { user: { firstName: "Member", lastName: "User", role: "member" } }
    });
    drawsApi.getLatest.mockResolvedValue({ data: { draw: drawFixture } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Monthly Draw Results")).toBeInTheDocument();
    });

    expect(screen.getByText(/Draw Numbers:/)).toBeInTheDocument();
    expect(screen.getByText("5, 10, 15, 20, 25")).toBeInTheDocument();
    expect(screen.getByText(/Your Participation:/)).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText(/Your Winnings:/)).toBeInTheDocument();
    expect(screen.getByText("GBP 25")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run Monthly Draw" })).not.toBeInTheDocument();
  });

  test("shows admin run button and refreshes draw after run", async () => {
    authApi.me.mockResolvedValue({
      data: { user: { firstName: "Admin", lastName: "User", role: "admin" } }
    });
    drawsApi.getLatest
      .mockResolvedValueOnce({ data: { draw: null } })
      .mockResolvedValueOnce({ data: { draw: drawFixture } });
    drawsApi.runMonthly.mockResolvedValue({ data: { ok: true } });

    renderPage();

    const runButton = await screen.findByRole("button", { name: "Run Monthly Draw" });
    await userEvent.click(runButton);

    await waitFor(() => {
      expect(drawsApi.runMonthly).toHaveBeenCalledTimes(1);
      expect(drawsApi.getLatest).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText("Monthly draw generated successfully.")).toBeInTheDocument();
    expect(screen.getByText("5, 10, 15, 20, 25")).toBeInTheDocument();
  });
});
