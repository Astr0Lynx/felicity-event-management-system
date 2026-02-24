import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import TicketModal from '../components/TicketModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); //all, normal, merch, completed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState(null);

  // 1. Load Data on Startup
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. Get User Info from LocalStorage (fastest way)
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          navigate('/login'); //redirect if not logged in
          return;
        }
        setUser(JSON.parse(storedUser));

        // B. Get My Registered Events from Backend
        const { data } = await api.get('/events/participant/me');
        console.log("My Events:", data);
        setMyEvents(data.data); //assuming backend returns data array

      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError("Could not load your events.");
        //invalid token, redirect
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Filter events based on status and type
  const getUpcomingEvents = () => {
    const now = new Date();
    return myEvents.filter(event => new Date(event.start_date) >= now);
  };

  const getCompletedEvents = () => {
    const now = new Date();
    return myEvents.filter(event => new Date(event.end_date) < now);
  };

  const getFilteredEvents = () => {
    const completed = getCompletedEvents();
    const upcoming = getUpcomingEvents();
    
    switch (activeTab) {
      case 'normal':
        return myEvents.filter(event => event.type === 'normal');
      case 'merchandise':
        return myEvents.filter(event => event.type === 'merchandise');
      case 'completed':
        return completed;
      case 'cancelled':
        // For now, no cancelled status - return empty array
        return [];
      default:
        return myEvents;
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading your dashboard...</div>;

  const upcomingEvents = getUpcomingEvents();
  const filteredEvents = getFilteredEvents();

  return (
    <div style={styles.container}>
      
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Welcome, {user?.first_name}!</h1>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Total Registrations</h3>
            <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold', color: '#2196F3' }}>{myEvents.length}</p>
        </div>
        <div style={styles.statCard}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Upcoming Events</h3>
            <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold', color: '#4CAF50' }}>{upcomingEvents.length}</p>
        </div>
        <div style={styles.statCard}>
            <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Find More</h3>
            <button 
              onClick={() => navigate('/events')} 
              style={styles.browseButton}
              aria-label="Browse all available events"
            >
                Browse All Events →
            </button>
        </div>
      </div>

      {/* Registered Events Section - Compact View */}
      <div style={styles.section}>
        <h2>🎫 My Registered Events ({myEvents.length})</h2>
        {myEvents.length === 0 ? (
          <p style={styles.noData}>You haven't registered for any events yet. <span style={{color: '#2196F3', cursor: 'pointer'}} onClick={() => navigate('/events')}>Browse events</span> to get started!</p>
        ) : (
          <div style={styles.compactList}>
            {myEvents.map((event) => {
              const registration = event.my_registration;
              const teamNameField = registration?.form_values?.find(fv => fv.field_name.toLowerCase().includes('team'));
              const teamName = teamNameField?.answer;
              
              // Get variant order summary for merchandise
              const variantSummary = event.type === 'merchandise' && registration ? (
                (registration.variant_orders && registration.variant_orders.length > 0) 
                  ? `🛒 ${registration.variant_orders.length} item(s)`
                  : registration.variant_name 
                    ? `🛒 ${registration.variant_name}`
                    : null
              ) : null;
              
              return (
                <div key={event._id} style={styles.compactCard} onClick={() => navigate(`/events/${event._id}`)}>
                  <div style={{flex: 1}}>
                    <h4 style={{margin: '0 0 5px 0'}}>{event.name}</h4>
                    <p style={{margin: '5px 0', fontSize: '13px', color: '#666'}}>
                      📅 {new Date(event.start_date).toLocaleDateString()}
                      {teamName && <span style={{marginLeft: '10px'}}>👥 {teamName}</span>}
                      {variantSummary && <span style={{marginLeft: '10px'}}>{variantSummary}</span>}
                    </p>
                  </div>
                  <span style={{
                    ...styles.typeBadge,
                    background: event.type === 'normal' ? '#e3f2fd' : '#fff3e0',
                    color: event.type === 'normal' ? '#1976d2' : '#f57c00'
                  }}>
                    {event.type.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Events Section */}
      <div style={styles.section}>
        <h2>📅 Upcoming Events ({upcomingEvents.length})</h2>
        {upcomingEvents.length === 0 ? (
          <p style={styles.noData}>No upcoming events in your registrations.</p>
        ) : (
          <div style={styles.eventsGrid}>
            {upcomingEvents.map((event) => (
              <div key={event._id} style={styles.eventCard} onClick={() => navigate(`/events/${event._id}`)}>
                <div style={styles.eventHeader}>
                  <h3 style={{ margin: 0 }}>{event.name}</h3>
                  <span style={{
                    ...styles.typeBadge,
                    background: event.type === 'normal' ? '#e3f2fd' : '#fff3e0',
                    color: event.type === 'normal' ? '#1976d2' : '#f57c00'
                  }}>
                    {event.type.toUpperCase()}
                  </span>
                </div>
                <p style={styles.eventOrganizer}>
                  🎪 {event.organizer_id?.email || 'Unknown Organizer'}
                </p>
                <p style={styles.eventDate}>
                  📅 {new Date(event.start_date).toLocaleString()} - {new Date(event.end_date).toLocaleString()}
                </p>
                <p style={styles.eventDescription}>{event.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Participation History Section */}
      <div style={styles.section}>
        <h2>📋 Participation History</h2>
        
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('all')}
            style={{...styles.tab, ...(activeTab === 'all' ? styles.activeTab : {})}}
          >
            All ({myEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('normal')}
            style={{...styles.tab, ...(activeTab === 'normal' ? styles.activeTab : {})}}
          >
            Normal ({myEvents.filter(e => e.type === 'normal').length})
          </button>
          <button
            onClick={() => setActiveTab('merchandise')}
            style={{...styles.tab, ...(activeTab === 'merchandise' ? styles.activeTab : {})}}
          >
            Merchandise ({myEvents.filter(e => e.type === 'merchandise').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={{...styles.tab, ...(activeTab === 'completed' ? styles.activeTab : {})}}
          >
            Completed ({getCompletedEvents().length})
          </button>
        </div>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <p style={styles.noData}>No events in this category</p>
        ) : (
          <div style={styles.historyList}>
            {filteredEvents.map((event) => {
              const isCompleted = new Date(event.end_date) < new Date();
              const registration = event.my_registration;
              
              // Extract team name if present in form values
              const teamNameField = registration?.form_values?.find(
                fv => fv.field_name.toLowerCase().includes('team')
              );
              const teamName = teamNameField?.answer;

              return (
                <div key={event._id} style={styles.historyCard}>
                  <div style={styles.historyHeader}>
                    <h4 style={{margin: 0, flex: 1}}>{event.name}</h4>
                    <span style={{
                      ...styles.statusBadge,
                      background: isCompleted ? '#e8f5e9' : '#fff3e0',
                      color: isCompleted ? '#2e7d32' : '#f57c00'
                    }}>
                      {isCompleted ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                  <div style={styles.historyDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Event Type:</span>
                      <span>{event.type}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Organizer:</span>
                      <span>{event.organizer_id?.email || 'Unknown'}</span>
                    </div>
                    {teamName && (
                      <div style={styles.detailRow}>
                        <span style={styles.label}>Team Name:</span>
                        <span style={{ fontWeight: 'bold', color: '#2196F3' }}>{teamName}</span>
                      </div>
                    )}
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Start Date:</span>
                      <span>{new Date(event.start_date).toLocaleDateString()}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Participation Status:</span>
                      <span style={{
                        color: isCompleted ? '#2e7d32' : '#f57c00',
                        fontWeight: 'bold'
                      }}>
                        {isCompleted ? 'Attended' : 'Registered'}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.label}>Ticket ID:</span>
                      <span 
                        style={styles.ticketIdLink} 
                        onClick={() => setSelectedEventId(event._id)}
                      >
                        {event._id.slice(-8).toUpperCase()} 🎫
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/events/${event._id}`)}
                    style={styles.viewButton}
                  >
                    View Event Details
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {selectedEventId && (
        <TicketModal 
          eventId={selectedEventId} 
          onClose={() => setSelectedEventId(null)} 
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    background: '#f5f5f5',
    minHeight: '100vh'
  },
  header: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  error: {
    color: '#d32f2f',
    background: '#ffebee',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    padding: '25px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  compactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  compactCard: {
    background: 'white',
    padding: '15px 20px',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid #eee'
  },
  browseButton: {
    marginTop: '10px',
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  section: {
    marginBottom: '40px'
  },
  noData: {
    background: 'white',
    padding: '40px',
    textAlign: 'center',
    borderRadius: '8px',
    color: '#666'
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  eventCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  typeBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginLeft: '10px'
  },
  eventOrganizer: {
    color: '#666',
    fontSize: '14px',
    margin: '5px 0'
  },
  eventDate: {
    color: '#888',
    fontSize: '13px',
    margin: '5px 0'
  },
  eventDescription: {
    color: '#666',
    fontSize: '14px',
    marginTop: '10px',
    lineHeight: '1.5'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: '#2196F3',
    color: 'white',
    borderColor: '#2196F3'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  historyCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '15px',
    borderBottom: '1px solid #eee'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  historyDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginBottom: '15px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px'
  },
  label: {
    fontWeight: 'bold',
    color: '#666',
    marginRight: '10px'
  },
  ticketIdLink: {
    fontFamily: 'monospace',
    background: '#e3f2fd',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#1976d2',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    ':hover': {
      background: '#2196F3',
      color: 'white'
    }
  },
  viewButton: {
    padding: '8px 16px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};