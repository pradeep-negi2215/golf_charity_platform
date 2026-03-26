const assertRequired = (key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
};

const getCorsOrigins = () => {
  const raw = process.env.CLIENT_URL || "http://localhost:5173";
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
  assertRequired("MONGODB_URI");

  if (nodeEnv === "production") {
    const cookieSecure = `${process.env.COOKIE_SECURE || "false"}`.toLowerCase() === "true";
    if (!cookieSecure) {
      throw new Error("COOKIE_SECURE must be true in production");
    }

    if (!process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL must be set in production");
    }
  }
};

module.exports = {
  validateEnvironment,
  getCorsOrigins
};
