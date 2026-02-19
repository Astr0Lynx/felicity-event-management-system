import express from "express"
import { protect, authorize } from "../middleware/authMiddleware.js";
import { 
    createEvent, 
    getAllEvents, 
    registerForEvent, 
    getOrganizerEvents, 
    getParticipantEvents, 
    getEventTicket, 
    updateEvent, 
    getEventById,
    scanAttendance,
    getAttendance,
    exportAttendanceCSV,
    uploadPaymentProof,
    getPendingPayments,
    getPaymentProof,
    approvePayment,
    rejectPayment
} from "../controllers/eventController.js";

import { 
    postMessage, 
    getMessages, 
    deleteMessage, 
    togglePinMessage, 
    reactToMessage 
} from "../controllers/forumController.js";

import {
    submitFeedback,
    getFeedback,
    exportFeedback,
    checkFeedbackStatus
} from "../controllers/feedbackController.js";


const router = express.Router();

//protected, only for organizers
router.post('/', protect, authorize('organizer'), createEvent);

//public
router.get('/', getAllEvents);

// Organizer Dashboard Route
router.get('/organizer/me', protect, authorize('organizer'), getOrganizerEvents);

// Payment Approval Routes - Must be before /:id routes
router.get('/organizer/pending-payments', protect, authorize('organizer', 'admin'), getPendingPayments);

// Participant Dashboard Route
router.get('/participant/me', protect, authorize('participant'), getParticipantEvents);

//Participant Event Registration Route
router.post('/:id/register', protect, registerForEvent);

// Ticket Route - Get ticket details with QR code data
router.get('/:eventId/ticket', protect, getEventTicket);

// Update Event Route - Organizer only
router.put('/:id', protect, authorize('organizer'), updateEvent);

// ===== TIER A: QR Scanner & Attendance Tracking =====
router.post('/:id/scan-attendance', protect, authorize('organizer'), scanAttendance);
router.get('/:id/attendance', protect, authorize('organizer'), getAttendance);
router.get('/:id/attendance/export', protect, authorize('organizer'), exportAttendanceCSV);

// ===== TIER A: Merchandise Payment Approval Workflow =====
router.post('/:id/upload-payment-proof', protect, authorize('participant'), uploadPaymentProof);
router.get('/:eventId/payment/:registrationId/proof', protect, authorize('organizer', 'admin'), getPaymentProof);
router.put('/:eventId/payment/:registrationId/approve', protect, authorize('organizer', 'admin'), approvePayment);
router.put('/:eventId/payment/:registrationId/reject', protect, authorize('organizer', 'admin'), rejectPayment);

// ===== TIER B: Real-Time Discussion Forum =====
router.post('/:id/forum/messages', protect, postMessage);
router.get('/:id/forum/messages', protect, getMessages);
router.delete('/:id/forum/messages/:messageId', protect, authorize('organizer'), deleteMessage);
router.put('/:id/forum/messages/:messageId/pin', protect, authorize('organizer'), togglePinMessage);
router.post('/:id/forum/messages/:messageId/react', protect, reactToMessage);

// ===== TIER C: Anonymous Feedback System =====
router.post('/:id/feedback', protect, authorize('participant'), submitFeedback);
router.get('/:id/feedback', getFeedback);  // Public access
router.get('/:id/feedback/export', protect, authorize('organizer'), exportFeedback);
router.get('/:id/feedback/check', protect, authorize('participant'), checkFeedbackStatus);

// Get single event by ID - Public (must be last to avoid conflicts)
router.get('/:id', getEventById);

export default router;