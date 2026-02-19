# Felicity Event Management System

A comprehensive full-stack event management system built with React (Vite), Node.js (Express), and MongoDB.

## Features

### Participants
- Browse and search events by name, tags, date range, and type
- Register for events with custom form fields
- Upload payment proofs for paid events
- Generate and view QR code tickets
- Participate in discussion forums
- Submit anonymous feedback

### Organizers
- Create and manage events (normal and merchandise types)
- Track registrations and attendance
- Approve/reject payment proofs
- Manage event merchandise variants and stock
- Scan QR codes for attendance tracking
- Export attendance and feedback reports
- Discord webhook integration for event notifications
- Request password resets

### Admin
- Approve/reject password reset requests
- Generate temporary passwords for organizers
- Manage payment approvals
- View organizer details and events
- Full system oversight

## Tech Stack

**Frontend:**
- React 19 with Vite
- React Router for navigation
- Axios for API calls
- html5-qrcode for QR scanning

**Backend:**
- Node.js with Express 5
- MongoDB with Mongoose
- JWT authentication
- bcrypt for password hashing
- Axios for Discord webhooks

**Database:**
- MongoDB Atlas (cloud-hosted)

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── scripts/         # Utility scripts (seed admin)
│   │   └── server.js        # Entry point
│   ├── .env                 # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios configuration
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── .env                 # Environment variables
│   └── package.json
│
├── deployment.txt           # Deployment URLs
└── DEPLOYMENT_GUIDE.md      # Detailed deployment instructions

```

## Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update with your MongoDB Atlas connection string and other credentials

4. Seed admin account (one-time only):
   ```bash
   npm run seed
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update `VITE_API_URL` to point to your backend

4. Start development server:
   ```bash
   npm run dev
   ```

Frontend will run on http://localhost:5173

## Default Credentials

**Admin:**
- Email: admin@felicity.iiit.ac.in
- Password: Password1234@felicityadmin

**Test Organizer:**
Create via admin panel or register as organizer

**Test Participant:**
Register via the registration page

## API Endpoints

### Authentication
- `POST /api/participants/login` - Participant login
- `POST /api/participants/register` - Participant registration
- `POST /api/organizer/login` - Organizer login
- `POST /api/admin/login` - Admin login

### Events
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (organizer)
- `PUT /api/events/:id` - Update event (organizer)
- `DELETE /api/events/:id` - Delete event (organizer)
- `POST /api/events/:id/register` - Register for event (participant)

### Feedback
- `GET /api/events/:id/feedback` - Get event feedback
- `POST /api/events/:id/feedback` - Submit feedback (participant)
- `GET /api/events/:id/feedback/check` - Check feedback status
- `GET /api/events/:id/feedback/export` - Export feedback CSV (organizer)

### Forum
- `GET /api/events/:id/forum` - Get discussions
- `POST /api/events/:id/forum` - Post discussion
- `POST /api/events/:id/forum/:postId/reply` - Reply to discussion

[See full API documentation in backend/src/routes/]

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

**Quick Deploy:**
1. Backend → Render/Railway
2. Frontend → Vercel/Netlify
3. Database → MongoDB Atlas (already configured)
4. Update `deployment.txt` with URLs

## Environment Variables

### Backend (.env)
```
MONGO_URL=your_mongodb_atlas_connection_string
PORT=5000
FRONTEND_URL=your_frontend_url_or_*
ADMIN_EMAIL=admin@felicity.iiit.ac.in
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```
VITE_API_URL=your_backend_url/api
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (Admin, Organizer, Participant)
- Anonymous feedback system with participant hashing
- Payment proof verification
- Secure file uploads (base64 encoding)
- CORS configuration
- Environment-based configuration

## Key Features Implemented

### Tier A (Core)
✅ User authentication (Participants, Organizers, Admin)
✅ Event CRUD operations
✅ Event registration with custom forms
✅ Payment proof upload
✅ Admin dashboard
✅ Organizer management

### Tier B (Advanced)
✅ QR code ticket generation
✅ QR code attendance scanning
✅ Discussion forums per event
✅ Payment status tracking
✅ Event search and filtering
✅ Attendance tracking and export

### Tier C (Premium)
✅ Anonymous feedback system
✅ Feedback analytics and statistics
✅ Feedback CSV export
✅ Star ratings and comments
✅ Rating distribution visualization

### Additional Features
✅ Merchandise events with variants
✅ Stock management
✅ Discord webhook integration
✅ Password reset workflow
✅ Profile management
✅ Event registration limits
✅ Deadline enforcement
✅ Responsive design

## Performance Optimizations

- Selective field loading with Mongoose `.select()`
- Excluded large fields (payment_proof, attendance) from list queries
- Atomic database operations for race condition prevention
- Efficient indexing on frequently queried fields
- Frontend code splitting with React Router
- Optimized bundle size with Vite

## Testing

### Manual Testing Checklist
- [ ] Participant registration and login
- [ ] Organizer registration and login (via admin approval)
- [ ] Admin login
- [ ] Event creation (normal and merchandise)
- [ ] Event registration
- [ ] Payment proof upload and approval
- [ ] QR code generation and scanning
- [ ] Discussion forum
- [ ] Feedback submission
- [ ] Password reset workflow
- [ ] Discord webhook notifications

## Known Limitations

- Free tier deployment may have cold start delays
- MongoDB Atlas free tier has 512MB storage limit
- File uploads limited to 10MB
- No email notification system (uses Discord webhooks)
- QR scanner requires HTTPS in production

## Future Enhancements

- Email notifications
- Real-time chat in forums
- Event calendar view
- Advanced analytics dashboard
- Multi-language support
- Mobile app

## Contributing

This is an academic project. For issues or suggestions, contact the development team.

## License

Academic project for DASS course, IIIT Hyderabad.

## Authors

- Guntesh Garg

## Acknowledgments

- IIIT Hyderabad DASS Course Team
- MongoDB Atlas for database hosting
- Vercel/Render for deployment platforms
