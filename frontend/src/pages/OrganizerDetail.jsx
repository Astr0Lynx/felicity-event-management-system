import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate, useParams } from 'react-router-dom';

export default function OrganizerDetail() {
  const navigate = useNavigate();
  const { id } = useParams(); // organizer detail ID
  const [organizer, setOrganizer] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    fetchOrganizerData();
    fetchFollowStatus();
    fetchFollowerCount();
  }, [id]);

  const fetchOrganizerData = async () => {
    try {
      // Fetch organizer details
      const { data: organizers } = await api.get('/admin/organizers/public');
      const foundOrganizer = organizers.find(org => org.organizer_details._id === id);
      
      if (!foundOrganizer) {
        setError('Organizer not found');
        setLoading(false);
        return;
      }
      
      setOrganizer(foundOrganizer);

      // Fetch all events
      const { data: allEvents } = await api.get('/events');
      
      // Filter events by this organizer (compare with organizer's _id, not organizer_details._id)
      const organizerEvents = allEvents.filter(
        event => event.organizer_id && 
                 (event.organizer_id._id === foundOrganizer._id || 
                  event.organizer_id === foundOrganizer._id)
      );

      // Split into upcoming and past events
      const now = new Date();
      const upcoming = organizerEvents.filter(event => new Date(event.start_date) >= now);
      const past = organizerEvents.filter(event => new Date(event.start_date) < now);

      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (err) {
      console.error('Error fetching organizer data:', err);
      setError('Failed to load organizer details');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async () => {
    try {
      const { data } = await api.get('/participants/profile');
      const clubIds = (data.data.followed_clubs || []).map(club => 
        typeof club === 'string' ? club : club._id
      );
      setIsFollowing(clubIds.some(clubId => clubId === id));
    } catch (err) {
      console.error('Error fetching follow status:', err);
    }
  };

  const fetchFollowerCount = async () => {
    try {
      const { data } = await api.get(`/admin/organizers/public`);
      // Count how many participants follow this organizer detail
      const { data: profileData } = await api.get('/participants/all-followers/' + id);
      setFollowerCount(profileData.count || 0);
    } catch (err) {
      // Fallback: just set to 0 if endpoint doesn't exist
      console.error('Error fetching follower count:', err);
      setFollowerCount(0);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        await api.post('/participants/unfollow-club', { organizer_detail_id: id });
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await api.post('/participants/follow-club', { organizer_detail_id: id });
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert(err.response?.data?.message || 'Failed to update follow status');
    }
  };

  const renderEventCard = (event) => (
    <div 
      key={event._id} 
      style={styles.eventCard}
      onClick={() => navigate(`/events/${event._id}`)}
    >
      <div style={styles.eventHeader}>
        <h3 style={styles.eventName}>{event.name}</h3>
        <span style={{
          ...styles.badge,
          background: event.type === 'normal' ? '#e3f2fd' : '#fff3e0',
          color: event.type === 'normal' ? '#1976d2' : '#f57c00'
        }}>
          {event.type.toUpperCase()}
        </span>
      </div>
      
      <p style={styles.eventDescription}>{event.description}</p>
      
      <div style={styles.eventMeta}>
        <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
        <span>💰 {event.reg_fee === 0 ? 'Free' : `₹${event.reg_fee}`}</span>
        <span>👥 {event.registered_participants?.length || 0} registered</span>
      </div>
    </div>
  );

  if (loading) {
    return <div style={styles.loading}>Loading organizer details...</div>;
  }

  if (error || !organizer) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'Organizer not found'}</div>
        <button onClick={() => navigate('/clubs')} style={styles.backButton}>
          ← Back to Clubs
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button onClick={() => navigate('/clubs')} style={styles.backButton}>
        ← Back to Clubs
      </button>

      {/* Organizer Info Card */}
      <div style={styles.infoCard}>
        <div style={styles.infoHeader}>
          <div style={{ flex: 1 }}>
            <h1 style={styles.organizerName}>{organizer.organizer_details.name}</h1>
            <span style={styles.categoryBadge}>{organizer.organizer_details.category}</span>
          </div>
          <button
            onClick={handleFollowToggle}
            style={{
              ...styles.followButton,
              ...(isFollowing ? styles.followingButton : {})
            }}
          >
            {isFollowing ? '✓ Following' : '+ Follow'}
          </button>
        </div>
        
        <p style={styles.description}>{organizer.organizer_details.description || 'No description available'}</p>
        
        <div style={styles.contactInfo}>
          <span style={styles.contactItem}>📧 {organizer.email}</span>
          <span style={styles.contactItem}>👥 {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}</span>
        </div>
      </div>

      {/* Events Section */}
      <div style={styles.eventsSection}>
        <h2>Events</h2>
        
        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('upcoming')}
            style={{
              ...styles.tab,
              ...(activeTab === 'upcoming' ? styles.activeTab : {})
            }}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            style={{
              ...styles.tab,
              ...(activeTab === 'past' ? styles.activeTab : {})
            }}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {/* Events List */}
        <div style={styles.eventsGrid}>
          {activeTab === 'upcoming' ? (
            upcomingEvents.length === 0 ? (
              <p style={styles.noData}>No upcoming events</p>
            ) : (
              upcomingEvents.map(renderEventCard)
            )
          ) : (
            pastEvents.length === 0 ? (
              <p style={styles.noData}>No past events</p>
            ) : (
              pastEvents.map(renderEventCard)
            )
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    minHeight: '100vh',
    background: '#f5f5f5'
  },
  loading: {
    padding: '50px',
    textAlign: 'center',
    fontSize: '18px'
  },
  error: {
    padding: '20px',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  backButton: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px',
    fontSize: '14px'
  },
  infoCard: {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  infoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  organizerName: {
    margin: 0,
    fontSize: '32px',
    color: '#2c3e50'
  },
  categoryBadge: {
    padding: '8px 16px',
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  description: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.8',
    marginBottom: '20px'
  },
  contactInfo: {
    display: 'flex',
    gap: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
    flexWrap: 'wrap'
  },
  contactItem: {
    color: '#555',
    fontSize: '14px'
  },
  followButton: {
    padding: '10px 24px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background 0.3s',
    whiteSpace: 'nowrap'
  },
  followingButton: {
    background: '#4CAF50'
  },
  eventsSection: {
    marginTop: '30px'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    marginBottom: '20px'
  },
  tab: {
    padding: '10px 20px',
    background: 'white',
    border: '2px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s'
  },
  activeTab: {
    background: '#2196F3',
    color: 'white',
    borderColor: '#2196F3'
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
  eventName: {
    margin: 0,
    fontSize: '18px',
    color: '#2c3e50',
    flex: 1
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    marginLeft: '10px'
  },
  eventDescription: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '15px',
    lineHeight: '1.5'
  },
  eventMeta: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#888',
    paddingTop: '10px',
    borderTop: '1px solid #eee'
  },
  noData: {
    textAlign: 'center',
    color: '#888',
    padding: '50px',
    fontSize: '16px'
  }
};
