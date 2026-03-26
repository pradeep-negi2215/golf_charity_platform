process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED = "true";

jest.mock("../src/config/mysql", () => {
  const subscriptions = new Map();

  const pool = {
    execute: jest.fn(async (sql, params = []) => {
      const normalizedSql = sql.replace(/\s+/g, " ").trim().toLowerCase();

      if (normalizedSql.includes("insert into subscriptions (")) {
        const [userId, planType, amount, currency, startedAt, endAt] = params;
        subscriptions.set(userId, {
          user_id: userId,
          plan_type: planType,
          amount: Number(amount),
          currency,
          status: "active",
          started_at: startedAt,
          end_at: endAt
        });

        return [{ affectedRows: 1 }, []];
      }

      if (normalizedSql.includes("insert into subscriptions_ledger")) {
        return [{ affectedRows: 1 }, []];
      }

      if (normalizedSql.includes("update subscriptions set")) {
        const [planType, status, startedAt, endAt, userId] = params;
        const current = subscriptions.get(userId);

        if (!current) {
          return [{ affectedRows: 0 }, []];
        }

        subscriptions.set(userId, {
          ...current,
          plan_type: planType,
          status,
          started_at: startedAt,
          end_at: endAt
        });

        return [{ affectedRows: 1 }, []];
      }

      if (normalizedSql.includes("from subscriptions where user_id = ?")) {
        const userId = params[0];
        const row = subscriptions.get(userId);
        return [row ? [row] : [], []];
      }

      return [[], []];
    })
  };

  return {
    getMySQLPool: () => pool,
    __reset: () => subscriptions.clear()
  };
});

const request = require("supertest");
const app = require("../src/app");

const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
} = require("./setup");

const mysqlConfig = require("../src/config/mysql");
const Charity = require("../src/models/charity.model");
const CharityContribution = require("../src/models/charity-contribution.model");

const registerMember = async (email, charityId) => {
  const response = await request(app).post("/api/auth/register").send({
    firstName: "Member",
    lastName: "Tester",
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

describe("subscription system", () => {
  let charity;

  beforeAll(async () => {
    await setupTestDatabase();
    charity = await Charity.create({
      name: "Test Charity Subscriptions",
      description: "Subscription charity",
      category: "community",
      country: "UK",
      status: "active"
    });
  });

  afterEach(async () => {
    await clearTestDatabase();
    mysqlConfig.__reset();
    charity = await Charity.create({
      name: `Test Charity Subscriptions ${Date.now()}`,
      description: "Subscription charity",
      category: "community",
      country: "UK",
      status: "active"
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("creates monthly subscription and returns active status", async () => {
    const member = await registerMember("sub-create@test.local", charity._id.toString());

    const createResponse = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        planType: "monthly",
        amount: 19.99
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.billingCycle).toBe("monthly");
    expect(createResponse.body.status).toBe("active");

    const statusResponse = await request(app)
      .get("/api/subscriptions/status")
      .set("Authorization", `Bearer ${member.token}`);

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.body.isActive).toBe(true);
    expect(statusResponse.body.planType).toBe("monthly");

    const contributions = await CharityContribution.find({ userId: member.user._id }).sort({ createdAt: -1 });
    expect(contributions.length).toBe(1);
    expect(contributions[0].percentage).toBe(10);
    expect(contributions[0].amount).toBeCloseTo(2.0, 2);
  });

  test("uses member donation percentage when creating subscription contribution", async () => {
    const member = await registerMember("sub-contribution-rate@test.local", charity._id.toString());

    await request(app)
      .patch("/api/users/me/charity")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        charityId: charity._id.toString(),
        donationPercentage: 25
      });

    const createResponse = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        planType: "monthly",
        amount: 40
      });

    expect(createResponse.statusCode).toBe(201);

    const contributions = await CharityContribution.find({ userId: member.user._id }).sort({ createdAt: -1 });
    expect(contributions.length).toBe(1);
    expect(contributions[0].percentage).toBe(25);
    expect(contributions[0].amount).toBeCloseTo(10, 2);
  });

  test("blocks donation percentage below 10 on profile update", async () => {
    const member = await registerMember("sub-low-percentage@test.local", charity._id.toString());

    await request(app)
      .patch("/api/users/me/charity")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        charityId: charity._id.toString(),
        donationPercentage: 15
      });

    const setTooLow = await request(app)
      .patch("/api/users/me/charity")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        charityId: charity._id.toString(),
        donationPercentage: 9
      });

    expect(setTooLow.statusCode).toBe(400);

    const createResponse = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        planType: "monthly",
        amount: 30
      });

    expect(createResponse.statusCode).toBe(201);
  });

  test("updates subscription to inactive status", async () => {
    const member = await registerMember("sub-update@test.local", charity._id.toString());

    await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        planType: "yearly",
        amount: 199.99
      });

    const updateResponse = await request(app)
      .patch("/api/subscriptions/status")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ status: "inactive" });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.subscription.status).toBe("inactive");

    const statusResponse = await request(app)
      .get("/api/subscriptions/status")
      .set("Authorization", `Bearer ${member.token}`);

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.body.isActive).toBe(false);
    expect(statusResponse.body.status).toBe("inactive");
  });

  test("blocks performance logs when member subscription is inactive", async () => {
    const member = await registerMember("sub-gate-block@test.local", charity._id.toString());

    const response = await request(app)
      .post("/api/performance-logs")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        playedAt: new Date().toISOString(),
        courseName: "Pine Grove",
        holesPlayed: 18,
        grossScore: 88,
        fairwaysHit: 7,
        greensInRegulation: 8,
        putts: 33
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toMatch(/subscription/i);
  });

  test("allows performance logs with active subscription", async () => {
    const member = await registerMember("sub-gate-pass@test.local", charity._id.toString());

    await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        planType: "monthly",
        amount: 19.99
      });

    const response = await request(app)
      .post("/api/performance-logs")
      .set("Authorization", `Bearer ${member.token}`)
      .send({
        playedAt: new Date().toISOString(),
        courseName: "Coastal Ridge",
        holesPlayed: 18,
        grossScore: 82,
        fairwaysHit: 10,
        greensInRegulation: 10,
        putts: 30
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.courseName).toBe("Coastal Ridge");
  });
});
