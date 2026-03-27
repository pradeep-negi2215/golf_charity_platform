const assertRequired = (key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
};

const getCorsOrigins = () => {
  const raw = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
  const origins = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return origins.length ? origins : ["http://localhost:5173"];
};

const validateEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV || "development";

  assertRequired("JWT_SECRET");
  assertRequired("JWT_REFRESH_SECRET");

  if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
    // Mongo can be unavailable in demo/degraded mode; startup will handle this gracefully.
    console.warn("MONGODB_URI/MONGO_URI not set: server will attempt demo/degraded startup.");
  }

  if (nodeEnv === "production") {
    const cookieSecure = `${process.env.COOKIE_SECURE || "false"}`.toLowerCase() === "true";
    if (!cookieSecure) {
      console.warn("COOKIE_SECURE is not true in production. Cross-site auth cookies may not work as expected.");
    }

    if (!process.env.CLIENT_URL && !process.env.FRONTEND_URL) {
      console.warn("CLIENT_URL/FRONTEND_URL not set in production. CORS may block frontend requests.");
    }
  }
};

module.exports = {
  validateEnvironment,
  getCorsOrigins
};
