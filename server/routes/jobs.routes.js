const router = require("express").Router();
const controller = require("../controllers/jobs.controller");

router.post("/", controller.createJob);
router.get("/:id", controller.getJob);
router.post("/:id/cancel", controller.cancelJob);

module.exports = router;
