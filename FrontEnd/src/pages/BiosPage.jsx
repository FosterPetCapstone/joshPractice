import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RunProgramButton from '../components/RunProgramButton';

const BiosPage = () => {
  const [fosters, setFosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFosters = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/profiles');
        setFosters(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching fosters:', err);
        setError('Failed to load foster profiles');
      } finally {
        setLoading(false);
      }
    };

    fetchFosters();
  }, []);

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      {/* Run Program Button at the top right */}
      <RunProgramButton />
      
      <h1>Foster Bios</h1>
      
      {loading && <p>Loading foster profiles...</p>}
      
      {error && (
        <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffeeee', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {!loading && !error && fosters.length === 0 && (
        <p>No foster profiles available.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {fosters.map(foster => (
          <div 
            key={foster.id} 
            style={{ 
              border: '1px solid #ddd', 
              borderRadius: '8px', 
              padding: '20px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h2>{foster.name} - {foster.pet_name}</h2>
              <div>
                {foster.call_completed ? (
                  <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Call Completed</span>
                ) : (
                  <span style={{ color: 'orange' }}>Pending Call</span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '14px', color: '#666' }}>
              <div>Email: {foster.email}</div>
              <div>Phone: {foster.phone_number}</div>
              <div>Preferred Time: {foster.preferred_contact_time}</div>
            </div>
            
            {foster.transcription ? (
              <div style={{ marginTop: '10px' }}>
                <h3>Bio:</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{foster.transcription}</div>
              </div>
            ) : (
              <div style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
                No bio generated yet
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BiosPage; 