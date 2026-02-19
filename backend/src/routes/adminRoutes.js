import express from "express"
import dotenv from "dotenv"
import { createOrganizer, deleteOrganizer, getAllOrganizers, loginAdmin, deleteEvent } from "../controllers/adminController.js";
import { getAllResetRequests, approveResetRequest, rejectResetRequest } from "../controllers/passwordResetController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

dotenv.config();

const router = express.Router();

// Public route - no auth needed
router.post("/login", loginAdmin);

// Public route - anyone can view approved organizers
router.get("/organizers/public", getAllOrganizers);

// Protected routes - admin only
router.get("/organizers", protect, authorize('admin'), getAllOrganizers);
router.post("/organizers", protect, authorize('admin'), createOrganizer);
router.delete("/organizers/:id", protect, authorize('admin'), deleteOrganizer);
router.delete("/events/:id", protect, authorize('admin'), deleteEvent);

// ===== TIER B: Password Reset Workflow =====
router.get("/password-reset-requests", protect, authorize('admin'), getAllResetRequests);
router.put("/password-reset-requests/:id/approve", protect, authorize('admin'), approveResetRequest);
router.put("/password-reset-requests/:id/reject", protect, authorize('admin'), rejectResetRequest);

export default router;