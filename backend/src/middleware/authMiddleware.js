import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import  {Participant, Admin, Organizer } from "../models/user.js"
dotenv.config();



const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.role === 'admin') {
                req.user = await Admin.findById(decoded.id).select('-password');
            } else if (decoded.role === 'organizer') {
                req.user = await Organizer.findById(decoded.id).select('-password');
            } else {
                req.user = await Participant.findById(decoded.id).select('-password');
            }

            if (!req.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Not authorized, user not found' 
                });
            }

            req.user.role = decoded.role;

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ 
                success: false, 
                message: 'Not authorized, token failed' 
            });
        }
    }

    if (!token) {
        res.status(401).json({ 
            success: false, 
            message: 'Not authorized, no token' 
        });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        // req.user.role exists because we manually attached it in 'protect' above
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false, 
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

export { protect, authorize };