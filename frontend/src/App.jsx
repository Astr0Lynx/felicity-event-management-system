
// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';

// Import the pages
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import BrowseEvents from './pages/BrowseEvents';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ManageOrganizers from './pages/ManageOrganizers';
import PasswordResetRequests from './pages/PasswordResetRequests';
import OrganizerDashboard from './pages/OrganizerDashboard';
import EventDetails from './pages/EventDetails';
import ClubsOrganizers from './pages/ClubsOrganizers';
import OrganizerDetail from './pages/OrganizerDetail';
import OngoingEvents from './pages/OngoingEvents';
import CreateEvent from './pages/CreateEvent';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import OrganizerProfile from './pages/OrganizerProfile';
import AttendanceScanner from './pages/AttendanceScanner';
import PaymentApprovals from './pages/PaymentApprovals';
import Navbar from './components/Navbar';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      {/* The Routes component acts like a switchboard */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Participant Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<BrowseEvents />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/clubs" element={<ClubsOrganizers />} />
        <Route path="/clubs/:id" element={<OrganizerDetail />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage-organizers" element={<ManageOrganizers />} />
        <Route path="/admin/password-reset-requests" element={<PasswordResetRequests />} />
        <Route path="/admin/payment-approvals" element={<PaymentApprovals />} />
        
        {/* Organizer Routes */}
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
        <Route path="/organizer/create-event" element={<CreateEvent />} />
        <Route path="/organizer/ongoing-events" element={<OngoingEvents />} />
        <Route path="/organizer/events/:id" element={<OrganizerEventDetail />} />
        <Route path="/organizer/profile" element={<OrganizerProfile />} />
        <Route path="/organizer/attendance/:eventId" element={<AttendanceScanner />} />
        <Route path="/organizer/payment-approvals" element={<PaymentApprovals />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
