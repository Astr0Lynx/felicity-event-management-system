import express from "express";
import { registerParticipant, loginParticipant, getProfile, updateProfile, followClub, unfollowClub, changePassword, getFollowerCount } from "../controllers/participantController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/register", registerParticipant);
router.post("/login", loginParticipant);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/follow-club", protect, followClub);
router.post("/unfollow-club", protect, unfollowClub);
router.put("/change-password", protect, changePassword);
router.get("/all-followers/:organizerDetailId", getFollowerCount);

export default router