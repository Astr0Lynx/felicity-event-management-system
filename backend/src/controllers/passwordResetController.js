import bcrypt from 'bcryptjs';
import { PasswordResetRequest, Organizer } from '../models/user.js';
import crypto from 'crypto';

//password reset workflow

//organizer request password reset
export async function requestPasswordReset(req, res) {
    try {
        const organizerId = req.user.id;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason for password reset'
            });
        }

        //check for existing pending request
        const existingRequest = await PasswordResetRequest.findOne({
            organizer_id: organizerId,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending password reset request'
            });
        }

        //create request
        const resetRequest = new PasswordResetRequest({
            organizer_id: organizerId,
            reason,
            status: 'pending'
        });

        await resetRequest.save();

        res.status(201).json({
            success: true,
            message: 'Password reset request submitted successfully. Admin will review your request.',
            data: {
                request_id: resetRequest._id,
                status: resetRequest.status,
                created_at: resetRequest.createdAt
            }
        });
    } catch (error) {
        console.error('Error in requestPasswordReset:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//get organizer reset history
export async function getMyResetHistory(req, res) {
    try {
        const organizerId = req.user.id;

        const requests = await PasswordResetRequest.find({
            organizer_id: organizerId
        })
        .populate('reviewed_by', 'email')
        .sort({ createdAt: -1 })
        .lean();

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests.map(req => ({
                request_id: req._id,
                reason: req.reason,
                status: req.status,
                requested_at: req.createdAt,
                reviewed_by: req.reviewed_by?.email || null,
                reviewed_at: req.reviewed_at,
                admin_comment: req.admin_comment,
                //dont send password back
            }))
        });
    } catch (error) {
        console.error('Error in getMyResetHistory:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//admin view all reset requests
export async function getAllResetRequests(req, res) {
    try {
        const { status } = req.query;

        const query = status ? { status } : {};

        const requests = await PasswordResetRequest.find(query)
            .populate('organizer_id', 'email organizer_details')
            .populate({
                path: 'organizer_id',
                populate: {
                    path: 'organizer_details',
                    model: 'OrganizerDetail',
                    select: 'name category'
                }
            })
            .populate('reviewed_by', 'email')
            .sort({ createdAt: -1 })
            .lean();

        const formattedRequests = requests
            .filter(req => req.organizer_id) //filter deleted organizers
            .map(req => ({
                request_id: req._id,
                organizer_email: req.organizer_id.email,
                club_name: req.organizer_id.organizer_details?.name || 'N/A',
                club_category: req.organizer_id.organizer_details?.category || 'N/A',
                reason: req.reason,
                status: req.status,
                requested_at: req.createdAt,
                reviewed_by: req.reviewed_by?.email || null,
                reviewed_at: req.reviewed_at,
                admin_comment: req.admin_comment,
                new_password: req.new_password  //admin needs this
            }));

        res.status(200).json({
            success: true,
            count: formattedRequests.length,
            data: formattedRequests
        });
    } catch (error) {
        console.error('Error in getAllResetRequests:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

// PUT /api/admin/password-reset-requests/:id/approve
//admin approve reset
export async function approveResetRequest(req, res) {
    try {
        const requestId = req.params.id;
        const adminId = req.user.id;
        const { admin_comment = '' } = req.body;

        const resetRequest = await PasswordResetRequest.findById(requestId);
        if (!resetRequest) {
            return res.status(404).json({
                success: false,
                message: 'Password reset request not found'
            });
        }

        if (resetRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Request already ${resetRequest.status}`
            });
        }

        //generate random password
        const newPassword = crypto.randomBytes(6).toString('hex');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        //update organizer password
        const organizer = await Organizer.findById(resetRequest.organizer_id);
        if (!organizer) {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }

        organizer.password = hashedPassword;
        await organizer.save();

        //update request status
        resetRequest.status = 'approved';
        resetRequest.reviewed_by = adminId;
        resetRequest.reviewed_at = new Date();
        resetRequest.admin_comment = admin_comment;
        resetRequest.new_password = newPassword; //store temporarily for admin
        await resetRequest.save();

        res.status(200).json({
            success: true,
            message: 'Password reset approved successfully',
            data: {
                organizer_email: organizer.email,
                new_password: newPassword,  //share with organizer
                message: 'Share this password with the organizer securely'
            }
        });
    } catch (error) {
        console.error('Error in approveResetRequest:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}

//admin reject reset
export async function rejectResetRequest(req, res) {
    try {
        const requestId = req.params.id;
        const adminId = req.user.id;
        const { admin_comment = '' } = req.body;

        if (!admin_comment || admin_comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Please provide a reason for rejection'
            });
        }

        const resetRequest = await PasswordResetRequest.findById(requestId);
        if (!resetRequest) {
            return res.status(404).json({
                success: false,
                message: 'Password reset request not found'
            });
        }

        if (resetRequest.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Request already ${resetRequest.status}`
            });
        }

        //update status
        resetRequest.status = 'rejected';
        resetRequest.reviewed_by = adminId;
        resetRequest.reviewed_at = new Date();
        resetRequest.admin_comment = admin_comment;
        await resetRequest.save();

        res.status(200).json({
            success: true,
            message: 'Password reset request rejected',
            data: {
                status: 'rejected',
                admin_comment
            }
        });
    } catch (error) {
        console.error('Error in rejectResetRequest:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
}
