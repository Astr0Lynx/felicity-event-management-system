import { Admin, Organizer, OrganizerDetail, Event } from "../models/user.js"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"

dotenv.config();

export async function loginAdmin (req, res) {
    try {
            const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if(!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password!"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, admin.password);

        if(!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password!"
            });
        }

        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            message: "Admin login successful",
            token: token,
            data: {
                id: admin._id,
                email: admin.email,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error("Error in loginAdmin");
        res.status(500).json({
            success:false,
            message: "Internal server error"
        });
    }

} 

export async function createOrganizer (req, res) {
    try {
        const { name, category, description } = req.body;

        //await TA response for checking existing organizer
        const existing = await OrganizerDetail.findOne({ name });
        if(existing) {
            return res.status(400).json({
                success: false,
                message: "Organizer with this name already exists!"
            })
        }

        //create new
        const organizerCount = await Organizer.countDocuments();
        const generatedEmail = `${name.toLowerCase()}@organizers.iiit.ac.in`;

        const generatedPassword = crypto.randomBytes(8).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(generatedPassword, salt);


        const newOrganizerDetail = new OrganizerDetail({ name, category, description });
        await newOrganizerDetail.save();

        const newOrganizer = new Organizer({ 
            email: generatedEmail, 
            password: hashedPassword, 
            organizer_details: newOrganizerDetail._id
        });

        await newOrganizer.save();
    
        res.status(201).json({
            success: true,
            message: "Organizer created successfully! Please save the credentials below",
            name: name,
            category: category,
            email: generatedEmail,
            password: generatedPassword
        })

    } catch (error) {
        console.error("Error in createOrganizer:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
}

export async function getAllOrganizers (req, res) {
    try {
        const organizers = await Organizer.find()
            .populate('organizer_details')
            .select('-password');
        res.status(200).json(organizers);
    } catch (error) {
        console.error("Error in getAllOrganizers");
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
    }
}

export async function deleteOrganizer (req, res) {
     try {
        const organizerDetailId = req.params.id;
        
        // Find the organizer detail first
        const organizerDetail = await OrganizerDetail.findById(organizerDetailId);
        if (!organizerDetail) {
            return res.status(404).json({
                success: false,
                message: "Organizer not found"
            });
        }

        // Find the organizer document that references this detail
        const organizer = await Organizer.findOne({ organizer_details: organizerDetailId });
        
        // Delete both documents
        await OrganizerDetail.findByIdAndDelete(organizerDetailId);
        if (organizer) {
            await Organizer.findByIdAndDelete(organizer._id);
        }

        res.status(200).json({
            success: true,
            message: "Organizer removed successfully"
        })
    } catch (error) {
        console.error("Error in deleteOrganizer:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
}

// Delete event (admin only)
export async function deleteEvent(req, res) {
    try {
        const eventId = req.params.id;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        await Event.findByIdAndDelete(eventId);

        res.status(200).json({
            success: true,
            message: "Event deleted successfully"
        });
    } catch (error) {
        console.error("Error in deleteEvent:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}