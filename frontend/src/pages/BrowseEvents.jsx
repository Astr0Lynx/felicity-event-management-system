import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function BrowseEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [followedClubs, setFollowedClubs] = useState( []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, normal, merchandise
  const [filterEligibility, setFilterEligibility] = useState('all');
  const [filterFollowed, setFilterFollowed] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  // Get user role for navigation
  const getUserDashboard = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return '/login';
    const user = JSON.parse(userStr);
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'organizer') return '/organizer/dashboard';
    return '/dashboard';
  };

  // 1. Fetch Events on Load
  useEffect(() => {
    fetchEvents();
    fetchFollowedClubs();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/events'); 
      setEvents(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowedClubs = async () => {
    try {
      const { data } = await api.get('/participants/profile');
      setFollowedClubs(data.data.followed_clubs || []);
    } catch (err) {
      console.error("Error fetching followed clubs:", err);
    }
  };

  // 2. Handle View Details
  const handleViewDetails = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  // 3. Get Trending Events (most registrations in last 24 hours)
  const getTrendingEvents = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return events
      .filter(event => new Date(event.createdAt) >= yesterday)
      .sort((a, b) => (b.registered_participants?.length || 0) - (a.registered_participants?.length || 0))
      .slice(0, 5);
  };

  // 4. Filter events based on all criteria
  const getFilteredEvents = () => {
    return events.filter(event => {
      // Search filter (event name, description, or organizer email)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        event.name.toLowerCase().includes(searchLower) ||
        (event.description && event.description.toLowerCase().includes(searchLower)) ||
        (event.organizer_id?.email && event.organizer_id.email.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;

      // Type filter
      if (filterType !== 'all' && event.type !== filterType) return false;

      // Eligibility filter
      if (filterEligibility !== 'all' && event.eligibility !== filterEligibility) return false;

      // Followed clubs filter
      if (filterFollowed) {
        const organizerId = event.organizer_id?._id || event.organizer_id;
        // Need to check if organizer's detail ID is in followed_clubs
        // This requires the organizer_id to be populated with the organizer document
        // For now, we'll skip this check if organizer data is not fully populated
        if (!followedClubs.length) return false;
        // This check might not work perfectly without proper population
        // You may need to adjust based on your data structure
      }

      // Date range filter
      if (dateFrom) {
        const eventDate = new Date(event.start_date);
        const fromDate = new Date(dateFrom);
        if (eventDate < fromDate) return false;
      }
      
      if (dateTo) {
        const eventDate = new Date(event.start_date);
        const toDate = new Date(dateTo);
        if (eventDate > toDate) return false;
      }

      return true;
    });
  };

  const trendingEvents = getTrendingEvents();
  const filteredEvents = getFilteredEvents();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>🎉 Browse Events</h1>
        <button onClick={() => navigate(getUserDashboard())} style={styles.backButton}>
            Back to Dashboard
        </button>
      </div>

      {/* Trending Events Section */}
      {trendingEvents.length > 0 && (
        <div style={styles.trendingSection}>
          <h2 style={{marginBottom: '15px'}}>🔥 Trending Events (Last 24h)</h2>
          <div style={styles.trendingGrid}>
            {trendingEvents.map(event => (
              <div 
                key={event._id} 
                style={styles.trendingCard}
                onClick={() => handleViewDetails(event._id)}
              >
                <h4 style={{margin: '0 0 8px 0'}}>{event.name}</h4>
                <span style={{fontSize: '12px', color: '#666'}}>
                  👥 {event.registered_participants?.length || 0} registered
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <input 
        placeholder="🔍 Search events or organizers..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={styles.searchBar}
      />

      {/* Filters */}
      <div style={styles.filtersContainer}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Event Type:</label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Types</option>
            <option value="normal">Normal Events</option>
            <option value="merchandise">Merchandise Events</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Eligibility:</label>
          <select 
            value={filterEligibility} 
            onChange={(e) => setFilterEligibility(e.target.value)}
            style={styles.select}
          >
            <option value="all">All</option>
            <option value="iiit-only">IIIT Only</option>
            <option value="non-iiit-only">Non-IIIT Only</option>
            <option value="all-participants">All Participants</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>From Date:</label>
          <input 
            type="date" 
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>To Date:</label>
          <input 
            type="date" 
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              checked={filterFollowed}
              onChange={(e) => setFilterFollowed(e.target.checked)}
              style={{marginRight: '8px'}}
            />
            Followed Clubs Only
          </label>
        </div>

        <button 
          onClick={() => {
            setSearchTerm('');
            setFilterType('all');
            setFilterEligibility('all');
            setFilterFollowed(false);
            setDateFrom('');
            setDateTo('');
          }}
          style={styles.resetButton}
        >
          Reset Filters
        </button>
      </div>

      {/* Events Grid */}
      <div style={{marginTop: '20px'}}>
        <h3 style={{marginBottom: '15px'}}>
          All Events ({filteredEvents.length})
        </h3>
        {loading ? <p>Loading events...</p> : (
          <div style={styles.grid}>
            {filteredEvents.length === 0 ? (
              <p style={styles.noEvents}>No events match your filters</p>
            ) : (
              filteredEvents.map(event => (
                <div key={event._id} style={styles.card} onClick={() => handleViewDetails(event._id)}>
                  <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{event.name}</h3>
                      <span style={{
                        ...styles.typeBadge,
                        background: event.type === 'normal' ? '#e3f2fd' : '#fff3e0',
                        color: event.type === 'normal' ? '#1976d2' : '#f57c00'
                      }}>
                        {event.type.toUpperCase()}
                      </span>
                  </div>
                  
                  <p style={styles.organizer}>
                    🎪 {event.organizer_id?.organizer_details?.name || event.organizer_id?.email || 'Unknown Organizer'}
                  </p>
                  
                  <p style={styles.date}>
                    📅 {new Date(event.start_date).toLocaleDateString()}
                  </p>
                  
                  <p style={styles.description}>
                    {event.description ? event.description.substring(0, 100) + '...' : 'No description'}
                  </p>
                  
                  <div style={styles.cardFooter}>
                    <span style={styles.price}>
                        {event.reg_fee === 0 ? "Free" : `₹${event.reg_fee}`}
                    </span>
                    <span style={styles.participants}>
                        👥 {event.registered_participants?.length || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const styles = {
    container: {
        padding: '30px',
        minHeight: '100vh',
        background: '#f5f5f5'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        background: 'white',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    backButton: {
        padding: '10px 20px',
        background: '#2196F3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    },
    trendingSection: {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    trendingGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '10px'
    },
    trendingCard: {
        background: '#fff3e0',
        padding: '15px',
        borderRadius: '6px',
        cursor: 'pointer',
        border: '2px solid #ffb74d',
        transition: 'transform 0.2s'
    },
    searchBar: {
        padding: '12px 15px',
        width: '100%',
        marginBottom: '20px',
        border: '2px solid #ddd',
        borderRadius: '6px',
        fontSize: '15px',
        boxSizing: 'border-box'
    },
    filtersContainer: {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end'
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: '150px'
    },
    filterLabel: {
        fontSize: '13px',
        fontWeight: 'bold',
        color: '#666',
        marginBottom: '5px'
    },
    select: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    dateInput: {
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px'
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '14px',
        cursor: 'pointer'
    },
    resetButton: {
        padding: '8px 16px',
        background: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        marginLeft: 'auto'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
    },
    card: {
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px'
    },
    cardTitle: {
        margin: 0,
        fontSize: '18px',
        color: '#333',
        flex: 1
    },
    typeBadge: {
        padding: '4px 12px',
        fontSize: '11px',
        borderRadius: '12px',
        fontWeight: 'bold',
        marginLeft: '10px'
    },
    organizer: {
        color: '#666',
        fontSize: '13px',
        margin: '8px 0'
    },
    date: {
        color: '#888',
        fontSize: '13px',
        margin: '8px 0'
    },
    description: {
        color: '#555',
        margin: '12px 0',
        lineHeight: '1.5',
        fontSize: '14px'
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #eee'
    },
    price: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#4CAF50'
    },
    participants: {
        fontSize: '13px',
        color: '#666'
    },
    noEvents: {
        textAlign: 'center',
        padding: '50px',
        color: '#888',
        gridColumn: '1 / -1'
    }
};