import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Admin } from '../models/user.js';
import { connectDB } from '../config/db.js';

dotenv.config();

const seedAdmin = async () => {
    try {
        await connectDB();

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        
        if (existingAdmin) {
            console.log('Admin already exists!');
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt); // Change this password!

        // Create admin
        const admin = new Admin({
            email: process.env.ADMIN_EMAIL,
            password: hashedPassword
        });

        await admin.save();

        console.log('✅ Admin created successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();