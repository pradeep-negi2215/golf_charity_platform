process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ADMIN_BOOTSTRAP_KEY = "bootstrap-key";
process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED = "false";

const request = require("supertest");
const app = require("../src/app");

const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
} = require("./setup");
const Charity = require("../src/models/charity.model");

const registerMember = async (email, charityId) => {
  const response = await request(app).post("/api/auth/register").send({
    firstName: "Member",
    lastName: "Player",
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

const bootstrapAdmin = async () => {
  const response = await request(app)
    .post("/api/auth/bootstrap-admin")
    .set("x-admin-bootstrap-key", process.env.ADMIN_BOOTSTRAP_KEY)
    .send({
      firstName: "Admin",
      lastName: "Manager",
      email: "admin@test.local",
      password: "StrongPass123!"
    });

  return {
    token: response.body.accessToken || response.body.token,
    user: response.body.user
  };
};

describe("rbac and ownership", () => {
  let charity;

  beforeAll(async () => {
    await setupTestDatabase();
    charity = await Charity.create({
      name: "Test Charity RBAC",
      description: "RBAC charity",
      category: "education",
      country: "UK",
      status: "active"
    });
  });

  afterEach(async () => {
    await clearTestDatabase();
    charity = await Charity.create({
      name: `Test Charity RBAC ${Date.now()}`,
      description: "RBAC charity",
      category: "education",
      country: "UK",
      status: "active"
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("member cannot access admin-only users list", async () => {
    const member = await registerMember("member1@test.local", charity._id.toString());

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${member.token}`);

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toMatch(/insufficient permissions/i);
  });

  test("admin can access users list", async () => {
    const admin = await bootstrapAdmin();
    await registerMember("member2@test.local", charity._id.toString());

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  test("member performance log create is forced to own userId", async () => {
    const memberA = await registerMember("membera@test.local", charity._id.toString());
    const memberB = await registerMember("memberb@test.local", charity._id.toString());

    const response = await request(app)
      .post("/api/performance-logs")
      .set("Authorization", `Bearer ${memberA.token}`)
      .send({
        userId: memberB.user._id,
        playedAt: new Date().toISOString(),
        courseName: "Oak Hills",
        holesPlayed: 18,
        grossScore: 86,
        fairwaysHit: 9,
        greensInRegulation: 8,
        putts: 32
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.userId).toBe(memberA.user._id);
  });

  test("admin can create and query performance logs for another user", async () => {
    const admin = await bootstrapAdmin();
    const member = await registerMember("targetmember@test.local", charity._id.toString());

    const createResponse = await request(app)
      .post("/api/performance-logs")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        userId: member.user._id,
        playedAt: new Date().toISOString(),
        courseName: "Royal Dunes",
        holesPlayed: 18,
        grossScore: 80,
        fairwaysHit: 12,
        greensInRegulation: 11,
        putts: 29
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.userId).toBe(member.user._id);

    const listResponse = await request(app)
      .get(`/api/performance-logs?userId=${member.user._id}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.length).toBe(1);
    expect(listResponse.body[0].userId).toBe(member.user._id);
  });
});
