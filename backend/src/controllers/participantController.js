import { Participant } from "../models/user.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config();

//registration
export async function registerParticipant (req, res) {
    try {
        // Get data from request body
        const { 
            first_name, 
            last_name, 
            email, 
            participant_type, 
            college_org_name,
            contact_number,
            password,
            year_of_study,
        } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid email format" 
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        if (participant_type === 'iiit') {
            const lowerEmail = email.toLowerCase();
            const isValidIIIT = lowerEmail.endsWith('@students.iiit.ac.in') || lowerEmail.endsWith('@research.iiit.ac.in');
            
            if (!isValidIIIT) {
                return res.status(400).json({
                    success: false,
                    message: "IIIT participants must use a valid institute email (@students.iiit.ac.in or @research.iiit.ac.in)"
                });
            }
        }

        //check if participant exists
        const exists = await Participant.findOne({email: email.toLowerCase()});

        if(exists) {
            res.status(400).json({
                message: "Participant with this email already exists!"
            });

        }

        //password hash
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        
        // Create new participant
        const participant = new Participant({
            first_name,
            last_name,
            email: email.toLowerCase(),
            participant_type,
            college_org_name,
            contact_number,
            password: hashedPassword,
            year_of_study,
        });

        await participant.save();
        
        res.status(201).json({
            success: true,
            message: 'Participant registered successfully',
            data: {
                id: participant._id,
                first_name: participant.first_name,
                last_name: participant.last_name,
                email: participant.email,
                participant_type: participant.participant_type
            }
        })
    } catch (error) {
            console.error('Error in registerParticipant:', error);
            res.status(500).json({ 
                success: false,
                message: 'Server error',
                error: error.message 
            });
    }
}

//login
export async function loginParticipant (req, res) {
    try {
        const { email, password } = req.body;

        const participant = await Participant.findOne({ email: email.toLowerCase() });

        if(!participant){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password!"
            })
        }

        const isPasswordCorrect = await bcrypt.compare(password, participant.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }


        //just returning success for now, NEED TO ADD 
        const token = jwt.sign({ id: participant._id, role: 'participant' }, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            data: {
                id: participant._id,
                first_name: participant.first_name,
                last_name: participant.last_name,
                email: participant.email,
                participant_type: participant.participant_type
            }
        });
    } catch (error) {
        console.error("Error in LoginParticipant");
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                message: 'Server error',
                error: error.message 
            });
        }
    }
}


//get profile
export async function getProfile(req, res) {
    try {
        const participant = await Participant.findById(req.user._id)
            .select('-password')
            .populate('followed_clubs');

        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }

        res.status(200).json({
            success: true,
            data: participant
        });
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

//update profile
export async function updateProfile(req, res) {
    try {
        const { first_name, last_name, contact_number, college_org_name, selected_interests, followed_clubs } = req.body;

        const participant = await Participant.findById(req.user._id);

        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }

        if (first_name) participant.first_name = first_name;
        if (last_name) participant.last_name = last_name;
        if (contact_number) participant.contact_number = contact_number;
        if (college_org_name) participant.college_org_name = college_org_name;
        if (selected_interests) participant.selected_interests = selected_interests;
        if (followed_clubs) participant.followed_clubs = followed_clubs;

        await participant.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: participant
        });
    } catch (error) {
        console.error('Error in updateProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

// Follow a club/organizer
export async function followClub(req, res) {
    try {
        const participantId = req.user.id;
        const { organizer_detail_id } = req.body;

        if (!organizer_detail_id) {
            return res.status(400).json({
                success: false,
                message: 'Organizer detail ID is required'
            });
        }

        const participant = await Participant.findById(participantId);
        
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }

        // Check if already following
        if (participant.followed_clubs.includes(organizer_detail_id)) {
            return res.status(400).json({
                success: false,
                message: 'Already following this club'
            });
        }

        participant.followed_clubs.push(organizer_detail_id);
        await participant.save();

        res.status(200).json({
            success: true,
            message: 'Club followed successfully',
            data: participant.followed_clubs
        });
    } catch (error) {
        console.error('Error in followClub:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}


// Unfollow a club/organizer
export async function unfollowClub(req, res) {
    try {
        const participantId = req.user.id;
        const { organizer_detail_id } = req.body;

        if (!organizer_detail_id) {
            return res.status(400).json({
                success: false,
                message: 'Organizer detail ID is required'
            });
        }

        const participant = await Participant.findById(participantId);
        
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }

        // Remove from followed_clubs
        participant.followed_clubs = participant.followed_clubs.filter(
            id => id.toString() !== organizer_detail_id
        );
        
        await participant.save();

        res.status(200).json({
            success: true,
            message: 'Club unfollowed successfully',
            data: participant.followed_clubs
        });
    } catch (error) {
        console.error('Error in unfollowClub:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

// Change password
export async function changePassword(req, res) {
    try {
        const participantId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const participant = await Participant.findById(participantId);
        
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'Participant not found'
            });
        }

        // Verify current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, participant.password);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        participant.password = hashedPassword;
        await participant.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

// Get follower count for an organizer
export async function getFollowerCount(req, res) {
    try {
        const organizerDetailId = req.params.organizerDetailId;

        // Count participants who follow this organizer
        const count = await Participant.countDocuments({
            followed_clubs: organizerDetailId
        });

        res.status(200).json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error in getFollowerCount:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}
