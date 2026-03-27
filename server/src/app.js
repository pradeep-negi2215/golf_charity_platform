const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const compression = require("compression");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const subscriptionsRoutes = require("./routes/subscriptions.routes");
const performanceRoutes = require("./routes/performance.routes");
const prizeEntriesRoutes = require("./routes/prize-entries.routes");
const charityRoutes = require("./routes/charity.routes");
const charitiesRoutes = require("./routes/charities.routes");
const scoresRoutes = require("./routes/scores.routes");
const drawsRoutes = require("./routes/draws.routes");
const adminRoutes = require("./routes/admin.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");
const { getCorsOrigins } = require("./config/env");

const app = express();

if (`${process.env.TRUST_PROXY || "false"}`.toLowerCase() === "true") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(compression());

const allowedOrigins = getCorsOrigins();

const isOriginAllowed = (origin, allowed) => {
  if (!origin) {
    return true;
  }

  if (!Array.isArray(allowed) || !allowed.length) {
    return true;
  }

  return allowed.some((item) => {
    if (!item || item === "*") {
      return true;
    }

    // Support wildcard patterns like https://*.vercel.app
    if (item.includes("*")) {
      const escaped = item.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      const regex = new RegExp(`^${escaped}$`);
      return regex.test(origin);
    }

    return origin === item;
  });
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/performance-logs", performanceRoutes);
app.use("/api/prize-entries", prizeEntriesRoutes);
app.use("/api/charity-contributions", charityRoutes);
app.use("/api/charities", charitiesRoutes);
app.use("/api/scores", scoresRoutes);
app.use("/api/draws", drawsRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Golf Charity Subscription API is running"
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
