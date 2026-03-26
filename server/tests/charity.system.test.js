process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ADMIN_BOOTSTRAP_KEY = "bootstrap-key";

const request = require("supertest");
const app = require("../src/app");

const Charity = require("../src/models/charity.model");
const {
  setupTestDatabase,
  clearTestDatabase,
  teardownTestDatabase
} = require("./setup");

const bootstrapAdmin = async () => {
  const response = await request(app)
    .post("/api/auth/bootstrap-admin")
    .set("x-admin-bootstrap-key", process.env.ADMIN_BOOTSTRAP_KEY)
    .send({
      firstName: "Admin",
      lastName: "Charity",
      email: "admin-charity@test.local",
      password: "StrongPass123!"
    });

  return {
    token: response.body.accessToken || response.body.token,
    user: response.body.user
  };
};

describe("charity system", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("signup requires charityId", async () => {
    const response = await request(app).post("/api/auth/register").send({
      firstName: "Member",
      lastName: "NoCharity",
      email: "member-no-charity@test.local",
      password: "StrongPass123!"
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/charityid/i);
  });

  test("signup rejects donationPercentage below 10", async () => {
    const charity = await Charity.create({
      name: "Signup Charity",
      description: "Signup test charity",
      category: "health",
      country: "UK",
      status: "active"
    });

    const response = await request(app).post("/api/auth/register").send({
      firstName: "Member",
      lastName: "LowPercent",
      email: "member-low-percent@test.local",
      password: "StrongPass123!",
      charityId: charity._id.toString(),
      donationPercentage: 5
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/at least 10/i);
  });

  test("public can list charities with search and category filter", async () => {
    await Charity.create([
      {
        name: "Youth Golf Fund",
        description: "Junior golf development",
        category: "sports",
        country: "UK",
        status: "active"
      },
      {
        name: "Green Planet Trust",
        description: "Course sustainability and trees",
        category: "environment",
        country: "UK",
        status: "active"
      }
    ]);

    const response = await request(app)
      .get("/api/charities")
      .query({ category: "sports", search: "youth" });

    expect(response.statusCode).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe("Youth Golf Fund");
  });

  test("admin can create update and delete charity", async () => {
    const admin = await bootstrapAdmin();

    const createResponse = await request(app)
      .post("/api/charities")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        name: "Birdie Care",
        description: "Community golf health programs",
        category: "community",
        country: "UK",
        status: "active"
      });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.body.name).toBe("Birdie Care");

    const charityId = createResponse.body._id;

    const updateResponse = await request(app)
      .put(`/api/charities/${charityId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        category: "health"
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.category).toBe("health");

    const deleteResponse = await request(app)
      .delete(`/api/charities/${charityId}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(deleteResponse.statusCode).toBe(200);

    const verifyDeleted = await request(app).get(`/api/charities/${charityId}`);
    expect(verifyDeleted.statusCode).toBe(404);
  });

  test("member can update selected charity and donation percentage", async () => {
    const firstCharity = await Charity.create({
      name: "First Charity",
      description: "First choice",
      category: "education",
      country: "UK",
      status: "active"
    });
    const secondCharity = await Charity.create({
      name: "Second Charity",
      description: "Second choice",
      category: "children",
      country: "UK",
      status: "active"
    });

    const registerResponse = await request(app).post("/api/auth/register").send({
      firstName: "Member",
      lastName: "Updater",
      email: "member-update-charity@test.local",
      password: "StrongPass123!",
      charityId: firstCharity._id.toString(),
      donationPercentage: 12
    });

    expect(registerResponse.statusCode).toBe(201);
    const token = registerResponse.body.accessToken || registerResponse.body.token;

    const updateResponse = await request(app)
      .patch("/api/users/me/charity")
      .set("Authorization", `Bearer ${token}`)
      .send({
        charityId: secondCharity._id.toString(),
        donationPercentage: 20
      });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.user.selectedCharity.name).toBe("Second Charity");
    expect(updateResponse.body.user.donationPercentage).toBe(20);
  });
});
