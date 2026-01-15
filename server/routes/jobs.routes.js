const router = require("express").Router();
const controller = require("../controllers/jobs.controller");
const { createJobsLimiter, createQueryLimiter } = require("../middleware/rateLimiter");

// Rate limiters
const jobsLimiter = createJobsLimiter();
const queryLimiter = createQueryLimiter();

// Create job - heavily rate limited (resource-intensive)
router.post("/", jobsLimiter, controller.createJob);

// Get job status - lighter rate limit (read-only)
router.get("/:id", queryLimiter, controller.getJob);

// Cancel job - use same limit as create (modifying state)
router.post("/:id/cancel", jobsLimiter, controller.cancelJob);

module.exports = router;
