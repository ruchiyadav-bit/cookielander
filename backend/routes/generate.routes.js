const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const generateController = require("../controllers/generate.controller");
const policyController = require("../controllers/policy.controller");

router.post("/", authenticate, generateController.generate);
router.post("/landing", authenticate, generateController.generateLanding);
router.post("/business-site", authenticate, generateController.generateBusinessSite);
router.post("/policy-pages", authenticate, policyController.generatePolicyPages);

module.exports = router;
