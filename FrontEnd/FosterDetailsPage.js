import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CallButton from './CallButton';
import GenerateBiographyButton from './GenerateBiographyButton';
import './FosterDetailsPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const FosterDetailsPage = ({ fosterId }) => {
  const [foster, setFoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFosterDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/profiles/${fosterId}`);
        setFoster(response.data);
      } catch (err) {
        console.error('Error fetching foster details:', err);
        setError('Failed to load foster details');
      } finally {
        setLoading(false);
      }
    };

    if (fosterId) {
      fetchFosterDetails();
    }
  }, [fosterId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!foster) return <div>No foster found</div>;

  return (
    <div className="foster-details-container">
      <h2>Foster Details</h2>
      
      <div className="foster-info">
        <p><strong>Name:</strong> {foster.name}</p>
        <p><strong>Phone Number:</strong> {foster.phone_number}</p>
        <p><strong>Email:</strong> {foster.email}</p>
        <p><strong>Pet Name:</strong> {foster.pet_name}</p>
        <p><strong>Preferred Contact Time:</strong> {foster.preferred_contact_time}</p>
      </div>

      <div className="action-buttons">
        <h3>Contact Foster:</h3>
        <div className="buttons-row">
          <CallButton 
            phoneNumber={foster.phone_number} 
            fosterId={foster.id} 
          />
          <GenerateBiographyButton
            fosterId={foster.id}
            callId={foster.call_id}
          />
        </div>
      </div>
    </div>
  );
};

export default FosterDetailsPage; 