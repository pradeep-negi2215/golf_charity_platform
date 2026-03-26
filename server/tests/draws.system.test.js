process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ADMIN_BOOTSTRAP_KEY = "bootstrap-key";

jest.mock("../src/config/mysql", () => ({
  getMySQLPool: () => ({
    execute: jest.fn(async (sql) => {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized.includes("sum(amount)") && normalized.includes("from subscriptions")) {
        return [[{ total: 1000 }], []];
      }

      return [[], []];
    })
  })
}));

const request = require("supertest");
const app = require("../src/app");

const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
} = require("./setup");
const Charity = require("../src/models/charity.model");

const bootstrapAdmin = async () => {
  const response = await request(app)
    .post("/api/auth/bootstrap-admin")
    .set("x-admin-bootstrap-key", process.env.ADMIN_BOOTSTRAP_KEY)
    .send({
      firstName: "Admin",
      lastName: "Draw",
      email: "admin-draw@test.local",
      password: "StrongPass123!"
    });

  return {
    token: response.body.accessToken || response.body.token,
    user: response.body.user
  };
};

const registerMember = async (email, charityId) => {
  const response = await request(app).post("/api/auth/register").send({
    firstName: "Member",
    lastName: "Draw",
    email,
    password: "StrongPass123!",
    charityId,
    donationPercentage: 10
  });

  return {
    token: response.body.accessToken || response.body.token,
    user: response.body.user
  };
};

const addScores = async (token, scores) => {
  for (const value of scores) {
    const response = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${token}`)
      .send({ value, date: "2026-03-01" });

    expect(response.statusCode).toBe(201);
  }
};

describe("monthly draw system", () => {
  let charity;

  beforeAll(async () => {
    await setupTestDatabase();
    charity = await Charity.create({
      name: "Test Charity Draws",
      description: "Draw charity",
      category: "children",
      country: "UK",
      status: "active"
    });
  });

  afterEach(async () => {
    await clearTestDatabase();
    jest.restoreAllMocks();
    charity = await Charity.create({
      name: `Test Charity Draws ${Date.now()}`,
      description: "Draw charity",
      category: "children",
      country: "UK",
      status: "active"
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("runs draw, stores winners by 3/4/5 match, and exposes participation/winnings", async () => {
    const admin = await bootstrapAdmin();
    const member3 = await registerMember("draw-3@test.local", charity._id.toString());
    const member4 = await registerMember("draw-4@test.local", charity._id.toString());
    const member5 = await registerMember("draw-5@test.local", charity._id.toString());
    const member0 = await registerMember("draw-0@test.local", charity._id.toString());

    await addScores(member3.token, [5, 10, 15, 1, 2]);
    await addScores(member4.token, [5, 10, 15, 20, 3]);
    await addScores(member5.token, [5, 10, 15, 20, 25]);
    await addScores(member0.token, [1, 2, 3, 4, 6]);

    const draws = [4 / 45, 9 / 45, 14 / 45, 19 / 45, 24 / 45];
    let drawIndex = 0;

    jest.spyOn(Math, "random").mockImplementation(() => {
      const value = draws[drawIndex] ?? draws[draws.length - 1];
      drawIndex += 1;
      return value;
    });

    const runResponse = await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-03" });

    expect(runResponse.statusCode).toBe(201);
    expect(runResponse.body.draw.drawNumbers).toEqual([5, 10, 15, 20, 25]);
    expect(runResponse.body.draw.participantCount).toBe(4);
    expect(runResponse.body.draw.winners.match3.length).toBe(1);
    expect(runResponse.body.draw.winners.match4.length).toBe(1);
    expect(runResponse.body.draw.winners.match5.length).toBe(1);
    expect(runResponse.body.draw.prizePool.totalSubscriptions).toBe(1000);
    expect(runResponse.body.draw.prizePool.pools.match3).toBe(250);
    expect(runResponse.body.draw.prizePool.pools.match4).toBe(350);
    expect(runResponse.body.draw.prizePool.pools.match5).toBe(400);
    expect(runResponse.body.draw.prizePool.perWinner.match3).toBe(250);
    expect(runResponse.body.draw.prizePool.perWinner.match4).toBe(350);
    expect(runResponse.body.draw.prizePool.perWinner.match5).toBe(400);
    expect(runResponse.body.draw.prizePool.rolloverOut).toBe(0);

    const latestForMember5 = await request(app)
      .get("/api/draws/monthly/latest")
      .set("Authorization", `Bearer ${member5.token}`);

    expect(latestForMember5.statusCode).toBe(200);
    expect(latestForMember5.body.draw.monthKey).toBe("2026-03");
    expect(latestForMember5.body.draw.currentUser.participated).toBe(true);
    expect(latestForMember5.body.draw.currentUser.matchCount).toBe(5);
    expect(latestForMember5.body.draw.currentUser.winnings).toBe(400);

    const duplicateRunResponse = await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-03" });

    expect(duplicateRunResponse.statusCode).toBe(409);
  });

  test("rolls over 5-match pool when no jackpot winner and adds it to next month", async () => {
    const admin = await bootstrapAdmin();
    const member4 = await registerMember("draw-roll-4@test.local", charity._id.toString());
    const member5 = await registerMember("draw-roll-5@test.local", charity._id.toString());

    await addScores(member4.token, [5, 10, 15, 20, 1]);
    await addScores(member5.token, [5, 10, 15, 20, 25]);

    const firstDrawRandoms = [4 / 45, 9 / 45, 14 / 45, 19 / 45, 29 / 45];
    let drawIndex = 0;

    jest.spyOn(Math, "random").mockImplementation(() => {
      const value = firstDrawRandoms[drawIndex] ?? firstDrawRandoms[firstDrawRandoms.length - 1];
      drawIndex += 1;
      return value;
    });

    const firstRun = await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-04" });

    expect(firstRun.statusCode).toBe(201);
    expect(firstRun.body.draw.drawNumbers).toEqual([5, 10, 15, 20, 30]);
    expect(firstRun.body.draw.winners.match5.length).toBe(0);
    expect(firstRun.body.draw.prizePool.pools.match5).toBe(400);
    expect(firstRun.body.draw.prizePool.rolloverOut).toBe(400);

    drawIndex = 0;
    const secondDrawRandoms = [4 / 45, 9 / 45, 14 / 45, 19 / 45, 24 / 45];
    Math.random.mockImplementation(() => {
      const value = secondDrawRandoms[drawIndex] ?? secondDrawRandoms[secondDrawRandoms.length - 1];
      drawIndex += 1;
      return value;
    });

    const secondRun = await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-05" });

    expect(secondRun.statusCode).toBe(201);
    expect(secondRun.body.draw.drawNumbers).toEqual([5, 10, 15, 20, 25]);
    expect(secondRun.body.draw.prizePool.rolloverIn).toBe(400);
    expect(secondRun.body.draw.prizePool.pools.match5).toBe(800);
    expect(secondRun.body.draw.prizePool.perWinner.match5).toBe(800);
    expect(secondRun.body.draw.prizePool.rolloverOut).toBe(0);

    const latestForMember5 = await request(app)
      .get("/api/draws/monthly/latest")
      .set("Authorization", `Bearer ${member5.token}`);

    expect(latestForMember5.statusCode).toBe(200);
    expect(latestForMember5.body.draw.monthKey).toBe("2026-05");
    expect(latestForMember5.body.draw.currentUser.matchCount).toBe(5);
    expect(latestForMember5.body.draw.currentUser.winnings).toBe(800);
  });

  test("returns draw participation history for authenticated member", async () => {
    const admin = await bootstrapAdmin();
    const member = await registerMember("draw-history@test.local", charity._id.toString());

    await addScores(member.token, [5, 10, 15, 20, 25]);

    const monthOneRandoms = [4 / 45, 9 / 45, 14 / 45, 19 / 45, 24 / 45];
    let drawIndex = 0;
    jest.spyOn(Math, "random").mockImplementation(() => {
      const value = monthOneRandoms[drawIndex] ?? monthOneRandoms[monthOneRandoms.length - 1];
      drawIndex += 1;
      return value;
    });

    const firstRun = await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-06" });

    expect(firstRun.statusCode).toBe(201);

    drawIndex = 0;
    const monthTwoRandoms = [0 / 45, 1 / 45, 2 / 45, 3 / 45, 4 / 45];
    Math.random.mockImplementation(() => {
      const value = monthTwoRandoms[drawIndex] ?? monthTwoRandoms[monthTwoRandoms.length - 1];
      drawIndex += 1;
      return value;
    });

    const secondRun = await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-07" });

    expect(secondRun.statusCode).toBe(201);

    const historyResponse = await request(app)
      .get("/api/draws/monthly/history?limit=6")
      .set("Authorization", `Bearer ${member.token}`);

    expect(historyResponse.statusCode).toBe(200);
    expect(Array.isArray(historyResponse.body.history)).toBe(true);
    expect(historyResponse.body.history.length).toBe(2);
    expect(historyResponse.body.history[0].monthKey).toBe("2026-07");
    expect(historyResponse.body.history[1].monthKey).toBe("2026-06");
    expect(historyResponse.body.history[1].participated).toBe(true);
    expect(historyResponse.body.history[1].matchCount).toBe(5);
    expect(historyResponse.body.history[1].winnings).toBe(400);
    expect(historyResponse.body.history[0].participated).toBe(false);
    expect(historyResponse.body.history[0].matchCount).toBe(0);
  });

  test("clamps draw history limit to minimum when zero or negative value is provided", async () => {
    const admin = await bootstrapAdmin();
    const member = await registerMember("draw-history-min@test.local", charity._id.toString());

    await addScores(member.token, [5, 10, 15, 20, 25]);

    const drawOneRandoms = [4 / 45, 9 / 45, 14 / 45, 19 / 45, 24 / 45];
    let drawIndex = 0;
    jest.spyOn(Math, "random").mockImplementation(() => {
      const value = drawOneRandoms[drawIndex] ?? drawOneRandoms[drawOneRandoms.length - 1];
      drawIndex += 1;
      return value;
    });

    await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-08" });

    drawIndex = 0;
    const drawTwoRandoms = [0 / 45, 1 / 45, 2 / 45, 3 / 45, 4 / 45];
    Math.random.mockImplementation(() => {
      const value = drawTwoRandoms[drawIndex] ?? drawTwoRandoms[drawTwoRandoms.length - 1];
      drawIndex += 1;
      return value;
    });

    await request(app)
      .post("/api/draws/monthly/run")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ monthKey: "2026-09" });

    const historyResponse = await request(app)
      .get("/api/draws/monthly/history?limit=0")
      .set("Authorization", `Bearer ${member.token}`);

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.body.history.length).toBe(1);
    expect(historyResponse.body.history[0].monthKey).toBe("2026-09");
  });

  test("clamps draw history limit to maximum of 36", async () => {
    const admin = await bootstrapAdmin();
    const member = await registerMember("draw-history-max@test.local", charity._id.toString());

    await addScores(member.token, [5, 10, 15, 20, 25]);

    for (let index = 1; index <= 40; index += 1) {
      const month = `${index}`.padStart(2, "0");
      const monthKey = `2027-${month}`;

      await request(app)
        .post("/api/draws/monthly/run")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ monthKey });
    }

    const historyResponse = await request(app)
      .get("/api/draws/monthly/history?limit=99")
      .set("Authorization", `Bearer ${member.token}`);

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.body.history.length).toBe(36);
  });

  test("uses default limit when draw history limit is non-numeric", async () => {
    const admin = await bootstrapAdmin();
    const member = await registerMember("draw-history-default@test.local", charity._id.toString());

    await addScores(member.token, [5, 10, 15, 20, 25]);

    for (let index = 1; index <= 20; index += 1) {
      const month = `${index}`.padStart(2, "0");
      const monthKey = `2028-${month}`;

      await request(app)
        .post("/api/draws/monthly/run")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ monthKey });
    }

    const historyResponse = await request(app)
      .get("/api/draws/monthly/history?limit=abc")
      .set("Authorization", `Bearer ${member.token}`);

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.body.history.length).toBe(12);
  });

  test("normalizes decimal draw history limit by flooring to nearest lower integer", async () => {
    const admin = await bootstrapAdmin();
    const member = await registerMember("draw-history-decimal@test.local", charity._id.toString());

    await addScores(member.token, [5, 10, 15, 20, 25]);

    for (let index = 1; index <= 10; index += 1) {
      const month = `${index}`.padStart(2, "0");
      const monthKey = `2029-${month}`;

      await request(app)
        .post("/api/draws/monthly/run")
        .set("Authorization", `Bearer ${admin.token}`)
        .send({ monthKey });
    }

    const historyResponse = await request(app)
      .get("/api/draws/monthly/history?limit=7.9")
      .set("Authorization", `Bearer ${member.token}`);

    expect(historyResponse.statusCode).toBe(200);
    expect(historyResponse.body.history.length).toBe(7);
  });

  test("rejects draw history request when token is missing", async () => {
    const response = await request(app).get("/api/draws/monthly/history");

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toMatch(/token is required/i);
  });

  test("rejects draw history request when token is invalid", async () => {
    const response = await request(app)
      .get("/api/draws/monthly/history")
      .set("Authorization", "Bearer invalid-token-value");

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toMatch(/invalid token/i);
  });

  test("allows admin to retrieve draw history", async () => {
    const admin = await bootstrapAdmin();

    const response = await request(app)
      .get("/api/draws/monthly/history")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.history)).toBe(true);
  });

  test("rejects latest draw request when token is missing", async () => {
    const response = await request(app).get("/api/draws/monthly/latest");

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toMatch(/token is required/i);
  });

  test("rejects latest draw request when token is invalid", async () => {
    const response = await request(app)
      .get("/api/draws/monthly/latest")
      .set("Authorization", "Bearer invalid-token-value");

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toMatch(/invalid token/i);
  });

  test("allows admin to retrieve latest draw endpoint", async () => {
    const admin = await bootstrapAdmin();

    const response = await request(app)
      .get("/api/draws/monthly/latest")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("draw");
  });
});
