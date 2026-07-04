const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const c = require("../controllers/admin.controller");
const policyController = require("../controllers/policy.controller");

router.use(authenticate, requireAdmin);

router.get("/stats",                c.getStats);
router.get("/users",                c.getAllUsers);
router.post("/users",               c.createUser);
router.put("/users/:id",            c.updateUser);
router.delete("/users/:id",         c.deleteUser);
router.put("/users/:id/features",   c.toggleFeatures);
router.get("/sheet",                c.getGlobalSheet);
router.put("/sheet",                c.setGlobalSheet);
router.get("/orphan-pages",         c.getOrphanPages);
router.post("/recover-pages",       c.recoverPages);

router.get("/policy-templates",             policyController.listPolicyTemplates);
router.put("/policy-templates/:id",         policyController.updatePolicyTemplate);
router.put("/users/:id/policy-authorization", policyController.setPolicyAuthorization);

module.exports = router;
