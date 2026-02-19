import dotenv from "dotenv"
dotenv.config();
import express from "express"
import cors from 'cors';

import {connectDB} from "./config/db.js"
import participantRoutes from "./routes/participantRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import organizerRoutes from "./routes/organizerRoutes.js"
import eventRoutes from "./routes/eventRoutes.js"
const app = express();
const PORT = process.env.PORT || 5000;



//middleware
// Increase payload size limit for base64 images (default is 100kb)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS configuration to handle Vercel preview URLs
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow all Vercel preview and production URLs
        if (origin.includes('vercel.app') || origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        
        // Allow localhost for development
        if (origin.includes('localhost')) {
            return callback(null, true);
        }
        
        // Fallback to env variable or allow all
        if (process.env.FRONTEND_URL === '*') {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true //allow cookies/tokens
}));

app.use("/api/participants", participantRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organizer', organizerRoutes);


app.get('/', (req, res) => {
    res.json({ message: 'Event Management API is running!' });
});

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("Server started on port: ", PORT);
    });
});