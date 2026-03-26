process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

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
    firstName: "Score",
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

describe("score management system", () => {
  let charity;

  beforeAll(async () => {
    await setupTestDatabase();
    charity = await Charity.create({
      name: "Test Charity Scores",
      description: "Score charity",
      category: "sports",
      country: "UK",
      status: "active"
    });
  });

  afterEach(async () => {
    await clearTestDatabase();
    charity = await Charity.create({
      name: `Test Charity Scores ${Date.now()}`,
      description: "Score charity",
      category: "sports",
      country: "UK",
      status: "active"
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test("rejects score values outside 1 to 45", async () => {
    const member = await registerMember("score-range@test.local", charity._id.toString());

    const lowResponse = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ value: 0, date: "2026-01-01" });

    expect(lowResponse.statusCode).toBe(400);

    const highResponse = await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ value: 46, date: "2026-01-01" });

    expect(highResponse.statusCode).toBe(400);
  });

  test("keeps only latest 5 scores and returns most recent first", async () => {
    const member = await registerMember("score-trim@test.local", charity._id.toString());

    const entries = [
      { value: 12, date: "2026-01-01" },
      { value: 18, date: "2026-01-05" },
      { value: 21, date: "2026-01-10" },
      { value: 30, date: "2026-01-15" },
      { value: 25, date: "2026-01-20" },
      { value: 15, date: "2026-01-25" }
    ];

    for (const entry of entries) {
      const response = await request(app)
        .post("/api/scores")
        .set("Authorization", `Bearer ${member.token}`)
        .send(entry);

      expect(response.statusCode).toBe(201);
    }

    const listResponse = await request(app)
      .get("/api/scores")
      .set("Authorization", `Bearer ${member.token}`);

    expect(listResponse.statusCode).toBe(200);
    expect(Array.isArray(listResponse.body.scores)).toBe(true);
    expect(listResponse.body.scores.length).toBe(5);

    const values = listResponse.body.scores.map((score) => score.value);
    expect(values).toEqual([15, 25, 30, 21, 18]);

    // Oldest item (value 12 on 2026-01-01) should have been removed after inserting the 6th score.
    expect(values.includes(12)).toBe(false);
  });

  test("scores remain user-scoped", async () => {
    const memberA = await registerMember("score-a@test.local", charity._id.toString());
    const memberB = await registerMember("score-b@test.local", charity._id.toString());

    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${memberA.token}`)
      .send({ value: 28, date: "2026-02-01" });

    await request(app)
      .post("/api/scores")
      .set("Authorization", `Bearer ${memberB.token}`)
      .send({ value: 14, date: "2026-02-02" });

    const responseA = await request(app)
      .get("/api/scores")
      .set("Authorization", `Bearer ${memberA.token}`);

    const responseB = await request(app)
      .get("/api/scores")
      .set("Authorization", `Bearer ${memberB.token}`);

    expect(responseA.statusCode).toBe(200);
    expect(responseB.statusCode).toBe(200);
    expect(responseA.body.scores.length).toBe(1);
    expect(responseB.body.scores.length).toBe(1);
    expect(responseA.body.scores[0].value).toBe(28);
    expect(responseB.body.scores[0].value).toBe(14);
  });

  test("concurrent score inserts still return max 5 and most recent first", async () => {
    const member = await registerMember("score-concurrent@test.local", charity._id.toString());

    const entries = Array.from({ length: 10 }).map((_, index) => {
      const day = `${index + 1}`.padStart(2, "0");
      return {
        value: index + 1,
        date: `2026-03-${day}`
      };
    });

    await Promise.all(
      entries.map((entry) =>
        request(app)
          .post("/api/scores")
          .set("Authorization", `Bearer ${member.token}`)
          .send(entry)
      )
    );

    const response = await request(app)
      .get("/api/scores")
      .set("Authorization", `Bearer ${member.token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.scores.length).toBe(5);

    const dates = response.body.scores.map((score) => new Date(score.date).getTime());
    const sortedDates = [...dates].sort((a, b) => b - a);
    expect(dates).toEqual(sortedDates);

    const returnedDateStrings = response.body.scores.map((score) => score.date.slice(0, 10));
    const expectedNewestDates = new Set(["2026-03-10", "2026-03-09", "2026-03-08", "2026-03-07", "2026-03-06"]);

    expect(new Set(returnedDateStrings)).toEqual(expectedNewestDates);
  });
});
