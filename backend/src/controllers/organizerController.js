import { Organizer, OrganizerDetail } from "../models/user.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { getAllOrganizers } from "./adminController.js";
import axios from "axios";

dotenv.config();

//login
export async function loginOrganizer (req, res) {
    try {
        const { email, password } = req.body;

        const organizer = await Organizer.findOne({ email: email.toLowerCase() });

        if(!organizer){
            return res.status(401).json({
                success: false,
                message: "Invalid email or password!"
            })
        }

        const isPasswordCorrect = await bcrypt.compare(password, organizer.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }


        const token = jwt.sign({ id: organizer._id, role: 'organizer' }, process.env.JWT_SECRET);

        const organizerDetail = await OrganizerDetail.findById(organizer.organizer_details);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            data: {
                id: organizer._id,
                email: organizer.email,
                details: organizerDetail
            }
        });
    } catch (error) {
        console.error("Error in LoginOrganizer");
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
}

// Get organizer profile
export async function getOrganizerProfile(req, res) {
    try {
        const organizerId = req.user.id;
        
        const organizer = await Organizer.findById(organizerId)
            .select('-password')
            .populate('organizer_details');

        if (!organizer) {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }

        res.status(200).json({
            success: true,
            email: organizer.email,
            contact_number: organizer.contact_number,
            discord_webhook: organizer.discord_webhook,
            organizer_details: organizer.organizer_details
        });
    } catch (error) {
        console.error('Error in getOrganizerProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

// Change organizer password
export async function changePassword(req, res) {
    try {
        const organizerId = req.user.id;
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

        const organizer = await Organizer.findById(organizerId);
        
        if (!organizer) {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }

        // Verify current password
        const isPasswordCorrect = await bcrypt.compare(currentPassword, organizer.password);
        
        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        organizer.password = hashedPassword;
        await organizer.save();

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

// Update organizer profile
export async function updateOrganizerProfile(req, res) {
    try {
        const organizerId = req.user.id;
        const { name, category, description, contact_number, discord_webhook } = req.body;

        const organizer = await Organizer.findById(organizerId);
        
        if (!organizer) {
            return res.status(404).json({
                success: false,
                message: 'Organizer not found'
            });
        }

        // Update organizer details
        if (name || category || description) {
            const organizerDetail = await OrganizerDetail.findById(organizer.organizer_details);
            if (organizerDetail) {
                if (name) organizerDetail.name = name;
                if (category) organizerDetail.category = category;
                if (description) organizerDetail.description = description;
                await organizerDetail.save();
            }
        }

        // Update organizer direct fields
        if (contact_number !== undefined) organizer.contact_number = contact_number;
        if (discord_webhook !== undefined) organizer.discord_webhook = discord_webhook;
        
        await organizer.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error in updateOrganizerProfile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
}

// Test Discord webhook
export async function testWebhook(req, res) {
    try {
        const { webhook_url } = req.body;

        if (!webhook_url) {
            return res.status(400).json({
                success: false,
                message: 'Webhook URL is required'
            });
        }

        // Send test message to Discord
        await axios.post(webhook_url, {
            content: '🎉 **Test Message from Felicity Event Management System**\n\nYour Discord webhook is configured correctly! New events will be posted here automatically.',
            username: 'Felicity Events'
        });

        res.status(200).json({
            success: true,
            message: 'Test message sent successfully'
        });
    } catch (error) {
        console.error('Error in testWebhook:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test message. Please check your webhook URL.'
        });
    }
}