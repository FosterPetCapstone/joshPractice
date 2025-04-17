import React, { useState } from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';

// API URL with fallbacks for different environments
const API_URL = Platform.select({
  web: 'http://localhost:8080',
  default: 'http://10.0.2.2:8080' // For Android emulator
});

const CallButton = ({ phoneNumber, fosterId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [error, setError] = useState(null);

  const handleCallNow = async () => {
    if (!phoneNumber) {
      setError('Phone number is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCallStatus(null);

    console.log(`Attempting to call: ${phoneNumber}, Foster ID: ${fosterId}`);
    
    // For debugging in dev console
    console.log(`Sending request to: ${API_URL}/api/make-call`);

    try {
      const response = await fetch(`${API_URL}/api/make-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber,
          fosterId
        })
      });

      // Check if response is valid JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Non-JSON response:", await response.text());
        throw new Error("API returned non-JSON response");
      }

      const data = await response.json();
      
      console.log("API response:", data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate call');
      }

      setCallStatus({
        success: true,
        message: 'Call initiated successfully',
        callId: data.call_id
      });
      console.log('Call initiated successfully:', data);
      
      // Show alert for better user feedback
      Alert.alert("Success", "Call initiated successfully!");
    } catch (err) {
      console.error('Error making call:', err);
      setError(err.message || 'Failed to initiate call');
      
      // Show alert for better user feedback
      Alert.alert("Error", `Failed to initiate call: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handleCallNow} 
        disabled={isLoading}
        style={[styles.button, isLoading && styles.buttonDisabled]}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.buttonText}>Calling...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Call Now</Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {callStatus && callStatus.success && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{callStatus.message}</Text>
          {callStatus.callId && <Text style={styles.successText}>Call ID: {callStatus.callId}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default CallButton; 