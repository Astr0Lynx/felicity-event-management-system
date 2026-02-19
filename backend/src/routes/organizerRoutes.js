import express from "express"
import { loginOrganizer, getOrganizerProfile, updateOrganizerProfile, testWebhook, changePassword } from "../controllers/organizerController.js";
import { requestPasswordReset, getMyResetHistory } from "../controllers/passwordResetController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/login", loginOrganizer);
router.get("/profile", protect, getOrganizerProfile);
router.put("/profile", protect, updateOrganizerProfile);
router.put("/change-password", protect, changePassword);
router.post("/test-webhook", protect, testWebhook);

// ===== TIER B: Password Reset Workflow =====
router.post("/request-password-reset", protect, requestPasswordReset);
router.get("/password-reset-history", protect, getMyResetHistory);

export default router;