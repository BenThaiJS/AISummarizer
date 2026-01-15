/**
 * Rate Limiting Middleware
 * Protects endpoints from abuse and resource exhaustion
 */

const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

/**
 * Rate limiter for job creation (most resource-intensive)
 * Default: 5 requests per 15 minutes per IP
 * Configurable via RATE_LIMIT_JOBS env var (e.g., "10/15m" = 10 per 15 minutes)
 */
function createJobsLimiter() {
  // Parse config: default "5/15m" means 5 requests per 15 minutes
  const config = process.env.RATE_LIMIT_JOBS || "5/15m";
  const [requestsStr, windowStr] = config.split("/");
  const windowMs = parseWindowToMs(windowStr || "15m");
  const maxRequests = parseInt(requestsStr, 10) || 5;

  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: "Too many summarization requests",
      message: `Maximum ${maxRequests} requests per ${formatWindow(windowMs)}. Please try again later.`,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for health check
      return req.path === "/health";
    },
    keyGenerator: (req) => {
      // Use IP address as key (falls back to forwarded IP)
      return req.ip || req.connection.remoteAddress;
    },
    handler: (req, res) => {
      logger.warn("rateLimit:exceeded", {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
      });
      res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${formatWindow(windowMs)}.`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}

/**
 * Rate limiter for progress/result queries (read-only, cheaper)
 * Default: 30 requests per 15 minutes per IP
 */
function createQueryLimiter() {
  const config = process.env.RATE_LIMIT_QUERY || "30/15m";
  const [requestsStr, windowStr] = config.split("/");
  const windowMs = parseWindowToMs(windowStr || "15m");
  const maxRequests = parseInt(requestsStr, 10) || 30;

  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.connection.remoteAddress,
    handler: (req, res) => {
      logger.warn("rateLimit:query_exceeded", {
        ip: req.ip,
        endpoint: req.path,
      });
      res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${formatWindow(windowMs)}.`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}

/**
 * Parse window string to milliseconds
 * @param {string} window - Format: "15m", "1h", "1d", "30s"
 * @returns {number} Milliseconds
 */
function parseWindowToMs(window) {
  const match = window.match(/^(\d+)([smhd])$/i);
  if (!match) return 15 * 60 * 1000; // Default: 15 minutes

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit.toLowerCase()) {
    case "s":
      return num * 1000;
    case "m":
      return num * 60 * 1000;
    case "h":
      return num * 60 * 60 * 1000;
    case "d":
      return num * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

/**
 * Format milliseconds to human-readable window
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted window
 */
function formatWindow(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}

module.exports = {
  createJobsLimiter,
  createQueryLimiter,
};
