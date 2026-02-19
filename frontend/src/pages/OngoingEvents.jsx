import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function OngoingEvents() {
  const navigate = useNavigate();
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOngoingEvents();
  }, []);

  const fetchOngoingEvents = async () => {
    try {
      const { data } = await api.get('/events/organizer/me');
      const now = new Date();
      
      // Filter events that are ongoing (started but not ended)
      const ongoing = data.data.filter(event => {
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);
        return startDate <= now && endDate >= now;
      });
      
      setOngoingEvents(ongoing);
    } catch (err) {
      console.error('Error fetching ongoing events:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading ongoing events...</div>;
  }

  return (
    <div style={styles.container}>
      <h1>Ongoing Events</h1>
      
      {ongoingEvents.length === 0 ? (
        <div style={styles.noEvents}>
          No ongoing events at the moment
        </div>
      ) : (
        <div style={styles.grid}>
          {ongoingEvents.map(event => (
            <div 
              key={event._id} 
              style={styles.card}
              onClick={() => navigate(`/organizer/events/${event._id}`)}
            >
              <h3>{event.name}</h3>
              <p style={styles.type}>Type: {event.type}</p>
              <p style={styles.participants}>
                Participants: {event.registered_participants?.length || 0}
              </p>
              <p style={styles.dates}>
                {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
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
  noEvents: {
    padding: '50px',
    textAlign: 'center',
    color: '#666',
    fontSize: '18px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)'
    }
  },
  type: {
    color: '#666',
    textTransform: 'capitalize',
    marginTop: '10px'
  },
  participants: {
    color: '#2196F3',
    fontWeight: 'bold'
  },
  dates: {
    fontSize: '14px',
    color: '#888',
    marginTop: '10px'
  }
};
