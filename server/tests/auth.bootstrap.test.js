process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ADMIN_BOOTSTRAP_KEY = "bootstrap-key";

const request = require("supertest");
const app = require("../src/app");

const User = require("../src/models/user.model");
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
} = require("./setup");

describe("auth bootstrap admin", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("creates first admin when valid bootstrap key is provided", async () => {
    const response = await request(app)
      .post("/api/auth/bootstrap-admin")
      .set("x-admin-bootstrap-key", process.env.ADMIN_BOOTSTRAP_KEY)
      .send({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "StrongPass123!"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.email).toBe("admin@example.com");
    expect(response.body.user.role).toBe("admin");
    expect(response.body.accessToken).toBeTruthy();

    const savedUser = await User.findOne({ email: "admin@example.com" });
    expect(savedUser).toBeTruthy();
    expect(savedUser.role).toBe("admin");
  });

  test("rejects bootstrap when an admin already exists", async () => {
    await request(app)
      .post("/api/auth/bootstrap-admin")
      .set("x-admin-bootstrap-key", process.env.ADMIN_BOOTSTRAP_KEY)
      .send({
        firstName: "First",
        lastName: "Admin",
        email: "first-admin@example.com",
        password: "StrongPass123!"
      });

    const secondAttempt = await request(app)
      .post("/api/auth/bootstrap-admin")
      .set("x-admin-bootstrap-key", process.env.ADMIN_BOOTSTRAP_KEY)
      .send({
        firstName: "Second",
        lastName: "Admin",
        email: "second-admin@example.com",
        password: "StrongPass123!"
      });

    expect(secondAttempt.statusCode).toBe(409);
    expect(secondAttempt.body.message).toMatch(/already exists/i);
  });

  test("rejects bootstrap with invalid key", async () => {
    const response = await request(app)
      .post("/api/auth/bootstrap-admin")
      .set("x-admin-bootstrap-key", "wrong-key")
      .send({
        firstName: "Admin",
        lastName: "User",
        email: "invalid-key@example.com",
        password: "StrongPass123!"
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.message).toMatch(/invalid bootstrap key/i);
  });
});
