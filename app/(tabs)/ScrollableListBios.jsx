import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Button, StyleSheet, CheckBox, ScrollView, Modal, Switch, Alert, ActivityIndicator } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import CallButton from '../components/CallButton';

const ScrollableListBios = ({ title, data }) => {
    const [profiles, setProfiles] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [filteredProfiles, setFilteredProfiles] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [aiGeneratedBio, setAiGeneratedBio] = useState("");
    const [emailSent, setEmailSent] = useState(false); // State for checkbox
    const [modalVisible, setModalVisible] = useState(false); // State for biography modal
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPreviewBio, setGeneratedPreviewBio] = useState("");
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [pendingBioData, setPendingBioData] = useState(null);
    
    // Form state for the bio generation modal
    const [bioFormData, setBioFormData] = useState({
        vaccinated: false,
        leashTrained: false,
        houseTrained: false,
        otherNotes: "",
        breed: "",
        species: "Dog", // Default value
        availableForAdoption: "Yes", // Default value
        spayedNeutered: "Yes" // Default value
    });

    const scrollViewRef = useRef(null);
    const bioBoxRef = useRef(null);

    useEffect(() => {
        fetch("http://localhost:8080/api/profiles")
            .then((response) => response.json())
            .then((data) => {
              console.log("Fetched profiles:", data);
              // Sort profiles by ID in ascending order
              const sortedProfiles = data.sort((a, b) => parseInt(a.id) - parseInt(b.id));
              setProfiles(sortedProfiles);
            })
            .catch((error) => console.error("Error fetching profiles:", error));
    }, []);

    const handleDeleteProfile = async (id) => {
      const confirmDelete = window.confirm("Are you sure you want to delete this profile?");
      if (!confirmDelete) return;
    
      try {
        await fetch(`http://localhost:8080/api/fosters/${id}`, {
          method: 'DELETE',
        });
    
        // Remove profile from local state
        const updatedProfiles = profiles.filter(profile => profile.id !== id);
        setProfiles(updatedProfiles);
        setFilteredProfiles(updatedProfiles);
        setSelectedProfile(null); // Go back to the list view after deletion
      } catch (error) {
        console.error("Failed to delete profile:", error);
        alert("Failed to delete profile. Please try again.");
      }
    };

    const handleSearch = (query) => {
      setSearchQuery(query);
      if (query.trim() === "") {
          setFilteredProfiles(profiles);
      } else {
          const filtered = profiles.filter(profile =>
              profile.id.toString().includes(query) ||
              profile.name.toLowerCase().includes(query.toLowerCase()) ||
              profile.email.toLowerCase().includes(query.toLowerCase()) ||
              profile.pet_name.toLowerCase().includes(query.toLowerCase())
          );
          setFilteredProfiles(filtered);
      }
  };

    const handleSelectProfile = (profile) => {
        setSelectedProfile(profile);
        setAiGeneratedBio(""); // Reset bio when selecting a new profile
    };

    const handleBackToList = () => {
      setSelectedProfile(null); // Go back to the list view
  };

    const handleGenerateBio = () => {
        // Reset form data when opening modal
        setBioFormData({
            vaccinated: false,
            leashTrained: false,
            houseTrained: false,
            otherNotes: "",
            breed: "",
            species: "Dog",
            availableForAdoption: "Yes",
            spayedNeutered: "Yes"
        });
        setModalVisible(true);
    };

    const handleBioFormChange = (field, value) => {
        setBioFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleGenerateBioSubmit = async () => {
        if (!selectedProfile?.id) {
            console.error("No foster ID available");
            Alert.alert("Error", "Could not retrieve foster information.");
            return;
        }
        
        setIsGenerating(true);
        
        try {
            // Collect all form data
            const bioData = {
                ...bioFormData,
                fosterId: selectedProfile.id,
                fosterName: selectedProfile.name,
                petName: selectedProfile.pet_name,
                transcription: selectedProfile.transcription || ""
            };
            
            console.log("Generating bio with data:", bioData);
            
            // First, verify backend connectivity
            try {
                const healthCheck = await fetch('http://localhost:8080');
                if (!healthCheck.ok) {
                    console.warn("Backend health check failed, but will attempt to proceed anyway");
                } else {
                    console.log("Backend connection verified");
                }
            } catch (error) {
                console.warn("Could not verify backend connectivity:", error.message);
                // Continue anyway, the main request might still work
            }
            
            // Using the foster ID to retrieve transcription data if not already available
            if (!bioData.transcription) {
                try {
                    const response = await fetch(`http://localhost:8080/api/fosters/${selectedProfile.id}/transcription`);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch transcription: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    bioData.transcription = data.transcription || "";
                    console.log("Retrieved transcription:", bioData.transcription);
                } catch (error) {
                    console.error("Error fetching transcription:", error);
                    Alert.alert("Warning", "Could not retrieve the full interview transcript. Biography may be incomplete.");
                }
            }
            
            // Send the data to the backend to generate biography with OpenAI
            console.log("Sending request to generate bio...");
            const generateResponse = await fetch('http://localhost:8080/api/generate-pet-bio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({...bioData, previewOnly: true})
            });
            
            console.log("Response status:", generateResponse.status);
            
            if (!generateResponse.ok) {
                const errorDetails = await generateResponse.text();
                console.error("Server error details:", errorDetails);
                throw new Error(`Failed to generate biography (${generateResponse.status}): ${errorDetails}`);
            }
            
            const result = await generateResponse.json();
            console.log("Bio generation successful, received biography length:", result.biography?.length || 0);
            
            // First close the form modal
            setModalVisible(false);
            
            // If generation was successful, show the preview modal
            if (result.biography) {
                // Store the generated biography for preview
                setGeneratedPreviewBio(result.biography);
                
                // Store the bio data for later use if accepted
                setPendingBioData(bioData);
                
                // Show the preview modal
                setPreviewModalVisible(true);
            } else {
                throw new Error("No biography received from server");
            }
        } catch (error) {
            console.error("Error in biography generation:", error);
            // Close modal even on error
            setModalVisible(false);
            Alert.alert("Error", `Failed to generate biography: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleAcceptBio = async () => {
        try {
            setIsGenerating(true);
            console.log("Accepting biography and saving to database...");
            console.log("Biography content length:", generatedPreviewBio.length);
            console.log("Foster ID:", pendingBioData.fosterId);
            
            // First, verify API connectivity
            try {
                console.log("Testing API connectivity...");
                const testResponse = await fetch('http://localhost:8080/api/test');
                if (testResponse.ok) {
                    const testData = await testResponse.json();
                    console.log("API test response:", testData);
                } else {
                    console.warn("API test failed with status:", testResponse.status);
                }
            } catch (error) {
                console.warn("API connectivity test failed:", error.message);
                // Continue anyway, the main request might still work
            }
            
            // Send request to save the biography to the database
            console.log("Sending save request to API...");
            const saveResponse = await fetch('http://localhost:8080/api/save-pet-bio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fosterId: pendingBioData.fosterId,
                    biography: generatedPreviewBio
                })
            });
            
            console.log("Save response status:", saveResponse.status);
            
            let responseText = "";
            try {
                responseText = await saveResponse.text();
                console.log("Raw response:", responseText);
            } catch (e) {
                console.error("Error reading response text:", e);
            }
            
            if (!saveResponse.ok) {
                throw new Error(`Failed to save biography (${saveResponse.status}): ${responseText}`);
            }
            
            let result;
            try {
                // Try to parse the response as JSON
                result = JSON.parse(responseText);
                console.log("Save response result:", result);
            } catch (e) {
                console.warn("Response is not valid JSON:", e);
                // Use a default result object if parsing fails
                result = { success: saveResponse.ok, message: "Biography saved (non-JSON response)" };
            }
            
            // Close preview modal
            setPreviewModalVisible(false);
            
            // Show success message
            Alert.alert(
                "Success", 
                `Biography for ${selectedProfile.pet_name} has been saved to the database.`,
                [{ 
                    text: "OK",
                    onPress: () => {
                        // Refresh UI focus on the bio section after alert is dismissed
                        console.log("Scrolling to biography section");
                        if (bioBoxRef.current) {
                            try {
                                bioBoxRef.current.measureLayout(
                                    bioBoxRef.current.getInnerViewNode(),
                                    (x, y) => {
                                        scrollViewRef.current?.scrollTo({ y, animated: true });
                                    }
                                );
                            } catch (error) {
                                console.warn("Could not auto-scroll:", error.message);
                            }
                        }
                    }
                }]
            );
            
            // Update the selected profile's transcription with the new biography
            const updatedProfile = {
                ...selectedProfile,
                transcription: generatedPreviewBio
            };
            
            // Update the profile in the state
            setSelectedProfile(updatedProfile);
            
            // Update the profile in the profiles list
            setProfiles(profiles.map(profile => 
                profile.id === selectedProfile.id ? updatedProfile : profile
            ));
            
            // Reset the preview state
            setGeneratedPreviewBio("");
            setPendingBioData(null);
            
            // Double-check that the update was successful by comparing the text
            setTimeout(() => {
                const bioDisplayed = bioBoxRef.current?.children[0]?.props?.children || "";
                const bioLength = typeof bioDisplayed === 'string' ? bioDisplayed.length : 0;
                console.log(`Biography display check: ${bioLength} characters displayed`);
                
                if (bioLength === 0 && generatedPreviewBio.length > 0) {
                    console.warn("Biography may not be displaying properly");
                }
            }, 500);
            
        } catch (error) {
            console.error("Error saving biography:", error);
            Alert.alert(
                "Error", 
                `Failed to save biography: ${error.message}. Please check the console for more details.`,
                [{ text: "OK" }]
            );
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDeclineBio = () => {
        // Close the preview modal without saving
        setPreviewModalVisible(false);
        // Reset the preview state
        setGeneratedPreviewBio("");
        setPendingBioData(null);
        
        Alert.alert(
            "Canceled", 
            "Biography generation was canceled. No changes were made.",
            [{ text: "OK" }]
        );
    };

    return (
        <View style={styles.listContainerBios}>
          <Text style={styles.header}>{title}</Text>

           {/* Search Bar */}
           <TextInput
                style={styles.searchBar}
                placeholder="Search profiles..."
                value={searchQuery}
                onChangeText={handleSearch}
            />

          
            <FlatList
                data={searchQuery ? filteredProfiles : profiles} // Show full list when no search is active
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleSelectProfile(item)} style={{ padding: 10, borderBottomWidth: 1 }}>
                        <View style={styles.item}>
                          <Text style={styles.title}>{item.name}</Text>
                          <Text style={styles.description}>Foster ID: {item.id}</Text>
                          <Text style={styles.description}>Email: {item.email}</Text>
                          <Text style={styles.description}>Phone: {item.phone_number}</Text>
                          <Text style={styles.description}>Pet Name: {item.pet_name}</Text>
                          <Text style={styles.description}>Preferred Contact Time: {item.preferred_contact_time}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />

            {selectedProfile && (
                <View style={styles.detailedProfileContainer}>
                  <ScrollView 
                    contentContainerStyle={styles.scrollViewContent}
                    showsVerticalScrollIndicator={true}
                    style={styles.scrollViewStyle}
                    ref={scrollViewRef}
                  >
                    <View style={styles.selectedProfileContainer}>
                      <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
                        <Icon name="arrow-left" size={20} color="#fff" /> 
                      </TouchableOpacity>
                      
                      <View style={styles.profileContentContainer}>
                        <Text style={styles.selectedProfileTitle}>{selectedProfile.name}</Text>
                        <Text style={styles.selectedProfileDescription}>Foster ID: {selectedProfile.id}</Text>
                        <Text style={styles.selectedProfileDescription}>Email: {selectedProfile.email}</Text>
                        <Text style={styles.selectedProfileDescription}>Phone: {selectedProfile.phone_number}</Text>
                        <Text style={styles.selectedProfileDescription}>Pet Name: {selectedProfile.pet_name}</Text>
                        <Text style={styles.selectedProfileDescription}>Preferred Contact Time: {selectedProfile.preferred_contact_time}</Text>

                        {/* Email Sent to Photography Team Checkbox */}
                        <View style={styles.checkboxContainer}>
                            <CheckBox
                                value={selectedProfile?.email_sent === true}
                                disabled={true}
                            />
                            <Text style={styles.checkboxLabel}>Email Sent to Photography Team</Text>
                        </View>

                        {/* AI-Generated Bio Section */}
                        <Text style={styles.bioTitle}>AI-Generated Bio:</Text>
                        <View 
                            style={styles.bioBox}
                            ref={bioBoxRef}
                        >
                          <Text style={styles.transcription}>{selectedProfile.transcription}</Text>
                        </View>

                        {/* Call Now Button */}
                        <View style={styles.callButtonContainer}>
                          <Text style={styles.callButtonTitle}>Contact Foster:</Text>
                          <View style={styles.buttonRow}>
                            <CallButton 
                              phoneNumber={selectedProfile.phone_number}
                              fosterId={selectedProfile.id}
                            />
                            
                            <TouchableOpacity 
                              onPress={handleGenerateBio} 
                              style={styles.generateBioButton}
                            >
                              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Generate Biography</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Delete Profile Button */}
                        <View style={styles.deleteButtonContainer}>
                          <TouchableOpacity
                            onPress={() => handleDeleteProfile(selectedProfile.id)}
                            style={styles.deleteButton}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete Profile</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </ScrollView>
                </View>
            )}
            
            {/* Biography Generation Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Generate Biography</Text>
                        <Text style={styles.modalSubtitle}>
                            Enter information about {selectedProfile?.name}'s pet {selectedProfile?.pet_name}
                        </Text>
                        
                        <View style={styles.formContainer}>
                            {/* Species Selection */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Species:</Text>
                                <View style={styles.radioButtonContainer}>
                                    <TouchableOpacity 
                                        style={styles.radioOption}
                                        onPress={() => handleBioFormChange('species', 'Dog')}
                                    >
                                        <View style={[
                                            styles.radioButton, 
                                            bioFormData.species === 'Dog' && styles.radioButtonSelected
                                        ]} />
                                        <Text style={styles.radioButtonLabel}>Dog</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.radioOption}
                                        onPress={() => handleBioFormChange('species', 'Cat')}
                                    >
                                        <View style={[
                                            styles.radioButton, 
                                            bioFormData.species === 'Cat' && styles.radioButtonSelected
                                        ]} />
                                        <Text style={styles.radioButtonLabel}>Cat</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Breed */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Breed:</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={bioFormData.breed}
                                    onChangeText={(text) => handleBioFormChange('breed', text)}
                                    placeholder="Enter breed"
                                />
                            </View>

                            {/* Checkboxes */}
                            <View style={styles.checkboxRow}>
                                <Text style={styles.formLabel}>Is vaccinated?</Text>
                                <Switch
                                    value={bioFormData.vaccinated}
                                    onValueChange={(value) => handleBioFormChange('vaccinated', value)}
                                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                                    thumbColor={bioFormData.vaccinated ? "#4A90E2" : "#f4f3f4"}
                                />
                            </View>

                            <View style={styles.checkboxRow}>
                                <Text style={styles.formLabel}>Is leash trained?</Text>
                                <Switch
                                    value={bioFormData.leashTrained}
                                    onValueChange={(value) => handleBioFormChange('leashTrained', value)}
                                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                                    thumbColor={bioFormData.leashTrained ? "#4A90E2" : "#f4f3f4"}
                                />
                            </View>

                            <View style={styles.checkboxRow}>
                                <Text style={styles.formLabel}>Is house trained?</Text>
                                <Switch
                                    value={bioFormData.houseTrained}
                                    onValueChange={(value) => handleBioFormChange('houseTrained', value)}
                                    trackColor={{ false: "#767577", true: "#81b0ff" }}
                                    thumbColor={bioFormData.houseTrained ? "#4A90E2" : "#f4f3f4"}
                                />
                            </View>
                            
                            {/* Available for Adoption */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Available for Adoption:</Text>
                                <View style={styles.radioButtonContainer}>
                                    <TouchableOpacity 
                                        style={styles.radioOption}
                                        onPress={() => handleBioFormChange('availableForAdoption', 'Yes')}
                                    >
                                        <View style={[
                                            styles.radioButton, 
                                            bioFormData.availableForAdoption === 'Yes' && styles.radioButtonSelected
                                        ]} />
                                        <Text style={styles.radioButtonLabel}>Yes</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.radioOption}
                                        onPress={() => handleBioFormChange('availableForAdoption', 'No')}
                                    >
                                        <View style={[
                                            styles.radioButton, 
                                            bioFormData.availableForAdoption === 'No' && styles.radioButtonSelected
                                        ]} />
                                        <Text style={styles.radioButtonLabel}>No</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Spayed/Neutered */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Spayed/Neutered:</Text>
                                <View style={styles.radioButtonContainer}>
                                    <TouchableOpacity 
                                        style={styles.radioOption}
                                        onPress={() => handleBioFormChange('spayedNeutered', 'Yes')}
                                    >
                                        <View style={[
                                            styles.radioButton, 
                                            bioFormData.spayedNeutered === 'Yes' && styles.radioButtonSelected
                                        ]} />
                                        <Text style={styles.radioButtonLabel}>Yes</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={styles.radioOption}
                                        onPress={() => handleBioFormChange('spayedNeutered', 'No')}
                                    >
                                        <View style={[
                                            styles.radioButton, 
                                            bioFormData.spayedNeutered === 'No' && styles.radioButtonSelected
                                        ]} />
                                        <Text style={styles.radioButtonLabel}>No</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Other Notes */}
                            <View style={styles.formField}>
                                <Text style={styles.formLabel}>Other Notes:</Text>
                                <TextInput
                                    style={styles.textAreaInput}
                                    value={bioFormData.otherNotes}
                                    onChangeText={(text) => handleBioFormChange('otherNotes', text)}
                                    placeholder="Enter any additional notes about the pet"
                                    multiline={true}
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel]}
                                onPress={() => setModalVisible(false)}
                                disabled={isGenerating}
                            >
                                <Text style={styles.textStyle}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.button, 
                                    styles.buttonGenerate,
                                    isGenerating && styles.buttonDisabled
                                ]}
                                onPress={handleGenerateBioSubmit}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.textStyle}>Generating...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.textStyle}>Generate</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* Biography Preview Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={previewModalVisible}
                onRequestClose={() => setPreviewModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.previewModalView}>
                        <Text style={styles.modalTitle}>Biography Preview</Text>
                        <Text style={styles.modalSubtitle}>
                            Review the generated biography for {selectedProfile?.pet_name}
                        </Text>
                        
                        <ScrollView style={styles.bioPreviewScrollView}>
                            <Text style={styles.bioPreviewText}>{generatedPreviewBio}</Text>
                        </ScrollView>
                        
                        <View style={styles.previewModalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonCancel, isGenerating && styles.buttonDisabled]}
                                onPress={handleDeclineBio}
                                disabled={isGenerating}
                            >
                                <Text style={styles.textStyle}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.buttonAccept, isGenerating && styles.buttonDisabled]}
                                onPress={handleAcceptBio}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#fff" />
                                        <Text style={styles.textStyle}>Saving...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.textStyle}>Accept & Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
  backButton: {
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 50,
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 1,
  },
  bioBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginTop: 15,
    width: '100%',
    minHeight: 150,
    backgroundColor: '#f9f9f9',
  },
  bioTitle: {
    marginTop: 25,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: 'center',
    width: '100%',
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    width: '100%',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 6,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: 'gray',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9534f',
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: 'gold',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  item: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
  },
  listContainerBios: {
    width: '90%',
    height: '90%',
    borderWidth: 3,
    borderColor: 'gold',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 20,
  },
  detailedProfileContainer: {
    width: '90%',
    height: '90%',
    borderWidth: 3,
    borderColor: 'gold',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  scrollViewStyle: {
    width: '100%',
    height: '100%',
  },
  scrollViewContent: {
    paddingBottom: 70,
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    margin: 10,
    paddingLeft: 10,
    backgroundColor: '#f5f5f5',
    fontSize: 16,
  },
  selectedProfileContainer: {
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  profileContentContainer: {
    display: 'flex',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    width: '100%',
    maxWidth: 800,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  selectedProfileTitle: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  selectedProfileDescription: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 10,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transcription: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  callButtonContainer: {
    marginTop: 25,
    alignItems: 'center',
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginTop: 10,
  },
  callButtonTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteButtonContainer: {
    marginTop: 30,
    marginBottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  generateBioButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    elevation: 3,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxWidth: 500
  },
  formContainer: {
    width: '100%',
    marginVertical: 15,
  },
  formField: {
    marginBottom: 15,
    width: '100%',
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 100,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
  },
  radioButtonContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginRight: 8,
  },
  radioButtonSelected: {
    backgroundColor: '#4A90E2',
    borderWidth: 6,
    borderColor: 'white',
  },
  radioButtonLabel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: '#555',
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%"
  },
  button: {
    borderRadius: 6,
    padding: 10,
    elevation: 2,
    minWidth: 100,
    margin: 5
  },
  buttonGenerate: {
    backgroundColor: "#4A90E2",
  },
  buttonCancel: {
    backgroundColor: "#d9534f",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  previewModalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%'
  },
  bioPreviewScrollView: {
    maxHeight: 400,
    width: '100%',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f9f9f9'
  },
  bioPreviewText: {
    fontSize: 16,
    lineHeight: 24,
  },
  previewModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10
  },
  buttonAccept: {
    backgroundColor: "#4CAF50",
  },
});

export default ScrollableListBios;
