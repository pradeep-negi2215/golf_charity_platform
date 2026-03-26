process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ADMIN_BOOTSTRAP_KEY = "bootstrap-key";

const request = require("supertest");
const app = require("../src/app");

const RefreshToken = require("../src/models/refresh-token.model");
const Charity = require("../src/models/charity.model");
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
} = require("./setup");

describe("auth session flow", () => {
  let charity;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    charity = await Charity.create({
      name: "Test Charity Session",
      description: "Session test charity",
      category: "health",
      country: "UK",
      status: "active"
    });
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("refresh rotates refresh token and revokes previous token", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      firstName: "Session",
      lastName: "User",
      email: "session-user@test.local",
      password: "StrongPass123!",
      charityId: charity._id.toString(),
      donationPercentage: 10
    });

    expect(registerResponse.statusCode).toBe(201);
    const initialAccessToken = registerResponse.body.accessToken || registerResponse.body.token;
    expect(initialAccessToken).toBeTruthy();

    const refreshResponse = await agent.post("/api/auth/refresh");

    expect(refreshResponse.statusCode).toBe(200);
    const refreshedAccessToken = refreshResponse.body.accessToken || refreshResponse.body.token;
    expect(refreshedAccessToken).toBeTruthy();
    expect(refreshedAccessToken).not.toBe(initialAccessToken);

    const allRefreshTokens = await RefreshToken.find({}).sort({ createdAt: 1 });
    expect(allRefreshTokens.length).toBe(2);

    const revokedTokens = allRefreshTokens.filter((item) => item.revokedAt);
    const activeTokens = allRefreshTokens.filter((item) => !item.revokedAt);

    expect(revokedTokens.length).toBe(1);
    expect(activeTokens.length).toBe(1);
  });

  test("logout revokes current refresh token and blocks further refresh", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      firstName: "Logout",
      lastName: "User",
      email: "logout-user@test.local",
      password: "StrongPass123!",
      charityId: charity._id.toString(),
      donationPercentage: 10
    });

    expect(registerResponse.statusCode).toBe(201);

    const logoutResponse = await agent.post("/api/auth/logout");
    expect(logoutResponse.statusCode).toBe(200);

    const refreshAfterLogout = await agent.post("/api/auth/refresh");
    expect(refreshAfterLogout.statusCode).toBe(401);

    const activeRefreshTokens = await RefreshToken.find({ revokedAt: null });
    expect(activeRefreshTokens.length).toBe(0);
  });

  test("refreshed access token can reach protected member endpoint", async () => {
    const agent = request.agent(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      firstName: "Protected",
      lastName: "Flow",
      email: "protected-flow@test.local",
      password: "StrongPass123!",
      charityId: charity._id.toString(),
      donationPercentage: 10
    });

    expect(registerResponse.statusCode).toBe(201);

    const refreshResponse = await agent.post("/api/auth/refresh");
    const refreshedAccessToken = refreshResponse.body.accessToken || refreshResponse.body.token;

    const meResponse = await agent
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${refreshedAccessToken}`);

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.body.user.email).toBe("protected-flow@test.local");
  });
});
