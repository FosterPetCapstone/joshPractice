import React, { useState } from 'react';
import axios from 'axios';
import './GenerateBiographyButton.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const GenerateBiographyButton = ({ fosterId, callId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateBiography = async () => {
    if (!callId) {
      setError('Call ID is required to generate a biography');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await axios.post(`${API_URL}/api/generate-biography`, {
        call_id: callId
      });

      setStatus({
        success: true,
        message: 'Biography generated successfully',
        fromDatabase: response.data.from_database
      });
    } catch (err) {
      console.error('Error generating biography:', err);
      setError(err.response?.data?.error || 'Failed to generate biography');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="generate-button-container">
      <button 
        onClick={handleGenerateBiography} 
        disabled={isLoading || !callId}
        className="generate-bio-button"
      >
        {isLoading ? 'Generating...' : 'Generate Biography'}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {status && status.success && (
        <div className="success-message">
          Biography {status.fromDatabase ? 'retrieved' : 'generated'} successfully!
        </div>
      )}
    </div>
  );
};

export default GenerateBiographyButton; 