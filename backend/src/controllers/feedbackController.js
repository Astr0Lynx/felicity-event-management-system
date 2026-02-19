import crypto from 'crypto';
import { Event } from '../models/user.js';

// Helper function to create anonymous hash from participant ID
function createParticipantHash(participantId, eventId) {
    return crypto.createHash('sha256').update(`${participantId}-${eventId}`).digest('hex');
}

// POST /api/events/:id/feedback
// Submit anonymous feedback for an event
export async function submitFeedback(req, res) {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;
        const { rating, comment } = req.body;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment is required'
            });
        }

        if (comment.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Comment must be 1000 characters or less'
            });
        }

        // Find event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if user is registered for this event
        const isRegistered = event.registered_participants.some(
            rp => rp.participant.toString() === userId
        );

        if (!isRegistered) {
            return res.status(403).json({
                success: false,
                message: 'Only registered participants can submit feedback'
            });
        }

        // Check if user has already submitted feedback (using hash for anonymity)
        const participantHash = createParticipantHash(userId, eventId);
        const hasSubmitted = event.feedback && event.feedback.some(
            fb => fb.participant_hash === participantHash
        );

        if (hasSubmitted) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted feedback for this event'
            });
        }

        // Initialize feedback array if it doesn't exist
        if (!event.feedback) {
            event.feedback = [];
        }

        // Add feedback (anonymous - no participant reference stored)
        event.feedback.push({
            rating: parseInt(rating),
            comment: comment.trim(),
            participant_hash: participantHash,
            submitted_at: new Date()
        });

        await event.save();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: {
                total_feedback: event.feedback.length
            }
        });
    } catch (error) {
        console.error('Error in submitFeedback:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

// GET /api/events/:id/feedback
// Get all feedback for an event with statistics (public access)
export async function getFeedback(req, res) {
    try {
        const eventId = req.params.id;
        const { rating_filter } = req.query; // Optional: filter by specific rating

        const event = await Event.findById(eventId)
            .select('name feedback');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        let feedbackList = event.feedback || [];

        // Filter by rating if specified
        if (rating_filter) {
            const filterRating = parseInt(rating_filter);
            if (filterRating >= 1 && filterRating <= 5) {
                feedbackList = feedbackList.filter(fb => fb.rating === filterRating);
            }
        }

        // Calculate statistics
        const totalFeedback = event.feedback ? event.feedback.length : 0;
        
        let stats = {
            total_feedback: totalFeedback,
            average_rating: 0,
            rating_distribution: {
                5: 0,
                4: 0,
                3: 0,
                2: 0,
                1: 0
            }
        };

        if (totalFeedback > 0) {
            // Calculate average
            const totalRating = event.feedback.reduce((sum, fb) => sum + fb.rating, 0);
            stats.average_rating = (totalRating / totalFeedback).toFixed(2);

            // Calculate distribution
            event.feedback.forEach(fb => {
                stats.rating_distribution[fb.rating]++;
            });

            // Convert counts to percentages
            Object.keys(stats.rating_distribution).forEach(rating => {
                const count = stats.rating_distribution[rating];
                stats.rating_distribution[rating] = {
                    count: count,
                    percentage: ((count / totalFeedback) * 100).toFixed(1)
                };
            });
        }

        // Return feedback without participant_hash (keep it truly anonymous)
        const anonymousFeedback = feedbackList.map(fb => ({
            rating: fb.rating,
            comment: fb.comment,
            submitted_at: fb.submitted_at
        }));

        res.status(200).json({
            success: true,
            data: {
                event_name: event.name,
                feedback: anonymousFeedback,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('Error in getFeedback:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

// GET /api/events/:id/feedback/export
// Export feedback to CSV (for organizers)
export async function exportFeedback(req, res) {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId)
            .select('name organizer_id feedback')
            .populate('organizer_id', 'email');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if user is the organizer
        if (event.organizer_id._id.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only the event organizer can export feedback'
            });
        }

        if (!event.feedback || event.feedback.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No feedback available for this event'
            });
        }

        // Calculate statistics for CSV header
        const totalFeedback = event.feedback.length;
        const totalRating = event.feedback.reduce((sum, fb) => sum + fb.rating, 0);
        const averageRating = (totalRating / totalFeedback).toFixed(2);

        // Generate CSV content
        let csv = `Event Name,${event.name}\n`;
        csv += `Total Feedback,${totalFeedback}\n`;
        csv += `Average Rating,${averageRating}\n`;
        csv += `\n`;
        csv += `Rating,Comment,Submitted At\n`;

        event.feedback.forEach(fb => {
            const comment = fb.comment.replace(/"/g, '""'); // Escape quotes
            const submittedAt = new Date(fb.submitted_at).toLocaleString();
            csv += `${fb.rating},"${comment}","${submittedAt}"\n`;
        });

        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="feedback-${event.name.replace(/\s+/g, '-')}-${Date.now()}.csv"`);
        
        res.status(200).send(csv);
    } catch (error) {
        console.error('Error in exportFeedback:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

// GET /api/events/:id/feedback/check
// Check if current user has submitted feedback
export async function checkFeedbackStatus(req, res) {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        const event = await Event.findById(eventId)
            .select('feedback registered_participants');

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Check if user is registered
        const isRegistered = event.registered_participants.some(
            rp => rp.participant.toString() === userId
        );

        // Check if already submitted
        const participantHash = createParticipantHash(userId, eventId);
        const hasSubmitted = event.feedback && event.feedback.some(
            fb => fb.participant_hash === participantHash
        );

        res.status(200).json({
            success: true,
            data: {
                can_submit: isRegistered && !hasSubmitted,
                is_registered: isRegistered,
                has_submitted: hasSubmitted
            }
        });
    } catch (error) {
        console.error('Error in checkFeedbackStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}
