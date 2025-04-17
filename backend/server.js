require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // For Node 18+
const { Configuration, OpenAIApi } = require("openai");
const Retell = require('retell-sdk');

const app = express();
const PORT = process.env.PORT || 8080;

// Retell API configuration
const RETELL_API_KEY = process.env.RETELL;
const FROM_PHONE_NUMBER = "+18446060918";

// Initialize Retell client
const client = new Retell({
  apiKey: RETELL_API_KEY
});

// OpenAI API configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI,
});
const openai = new OpenAIApi(configuration);

// Middleware
app.use(express.json()); // replaced body-parser
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:19006', // Add Expo development server
    'https://aaupetrescue-hta0efhnh2gtgrcv.eastus2-01.azurewebsites.net' // Azure deployment URL
  ],
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization,Accept'
}));

// PostgreSQL Database Connection
const pool = new Pool({
  connectionString: process.env.Database_URL,
  ssl: { rejectUnauthorized: false }
});

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Route: send photo request email
app.post('/api/send-photo-request', async (req, res) => {
  const { recipientEmail, fosterName, petName } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: `Photo Request for ${petName}`,
    text: `Hi ${fosterName},\n\nThanks for completing the foster interview! You mentioned you don't have any photos of ${petName}.\n\nPlease reply to this email to schedule a photography shoot with the team at your convenience.\n\nThank you!\nAngels Among Us Pet Rescue`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Photo request email sent!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

app.post('/api/check-photo-request', async (req, res) => {
  const { foster } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM fosters WHERE call_id = $1',
      [foster.call_id]
    );

    const dbFoster = result.rows[0];

    if (dbFoster && dbFoster.photographyneeded === true) {
      const {
        id,
        name: fosterName,
        email,
        pet_name: petName,
        preferred_contact_time: contactTime
      } = dbFoster;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'angelsphotographyemail@gmail.com',
        subject: `Photography Needed for ${petName}`,
        text: `📸 New Photography Request\n\nFoster Name: ${fosterName}\nFoster Email: ${email}\nFoster ID: ${id}\nPet Name: ${petName}\nPreferred Contact Time: ${contactTime}\n\nPlease reach out to the foster to schedule a photoshoot for their pet!\n\nThanks!\nAngels Among Us Pet Rescue`
      };

      await transporter.sendMail(mailOptions);

      await pool.query(
        'UPDATE fosters SET photographyneeded = false WHERE call_id = $1',
        [dbFoster.call_id]
      );

      res.status(200).json({ message: 'Photography team notified & flag reset' });
    } else {
      res.status(200).json({ message: 'No email needed – photographyNeeded is false or missing' });
    }
  } catch (error) {
    console.error('Error in /api/check-photo-request route:', error);
    res.status(500).json({ error: 'Server error while processing transcription' });
  }
});

// Route: test email functionality
app.get('/api/test-email', async (req, res) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: 'Test Email from AAUPR Backend',
    text: 'Hi there! This is a test email sent from your backend using Nodemailer. If you received this, your setup is working!'
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Test email sent');
    res.status(200).json({ message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ error: 'Failed to send test email.' });
  }
});

// Test DB
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
  } else {
    console.log('Connected to PostgreSQL:', res.rows[0]);
  }
});

// Allowed values
const validContactTimes = ['7AM-10AM', '10AM-12PM', '12PM-2PM', '2PM-5PM', '5PM-8PM'];

// GET profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fosters');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fosters:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET single profile by ID
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM fosters WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Foster not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching foster by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST profile
app.post('/api/profiles', async (req, res) => {
  try {
    const { name, phone_number, email, pet_name, preferred_contact_time } = req.body;

    if (!name || !phone_number || !email || !pet_name || !preferred_contact_time) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!validContactTimes.includes(preferred_contact_time)) {
      return res.status(400).json({ error: "Invalid preferred contact time" });
    }

    const result = await pool.query(
      `INSERT INTO fosters (name, phone_number, email, pet_name, preferred_contact_time) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, phone_number, email, pet_name, preferred_contact_time]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding foster:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE profile
app.delete('/api/fosters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM fosters WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Foster not found" });
    }

    res.json({ message: "Foster deleted successfully", deletedFoster: result.rows[0] });
  } catch (error) {
    console.error('Error deleting foster:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Root route - health check
app.get('/', (req, res) => {
  res.send('Welcome to the AAUPR Backend API!');
});

// Test API endpoint to verify connectivity
app.get('/api/test', (req, res) => {
  console.log('API test endpoint called');
  res.status(200).json({
    status: 'success',
    message: 'API is running and accessible',
    timestamp: new Date().toISOString()
  });
});

// Save pet biography endpoint
app.post('/api/save-pet-bio', async (req, res) => {
  const { fosterId, biography } = req.body;
  
  console.log(`Received request to save biography for foster ID: ${fosterId}`);
  console.log(`Biography length: ${biography ? biography.length : 0} characters`);
  
  if (!fosterId) {
    return res.status(400).json({ error: 'Foster ID is required' });
  }
  
  if (!biography || biography.trim() === '') {
    return res.status(400).json({ error: 'Biography text is required' });
  }
  
  try {
    // Update the database with the provided biography
    console.log(`Executing database update for foster ID: ${fosterId}`);
    const result = await pool.query(
      'UPDATE fosters SET transcription = $1 WHERE id = $2 RETURNING *',
      [biography, fosterId]
    );
    
    // Check if any rows were affected
    if (result.rowCount === 0) {
      console.log(`No foster found with ID: ${fosterId}`);
      return res.status(404).json({ error: `No foster found with ID: ${fosterId}` });
    }
    
    console.log(`Successfully saved biography for foster ID ${fosterId}`);
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Biography saved successfully'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database error', 
      message: error.message 
    });
  }
});

// Generate pet biography with AI
app.post('/api/generate-pet-bio', async (req, res) => {
  const { 
    fosterId, 
    petName, 
    transcription, 
    species, 
    breed, 
    vaccinated, 
    leashTrained, 
    houseTrained,
    availableForAdoption,
    spayedNeutered, 
    otherNotes,
    previewOnly
  } = req.body;

  console.log(`Received bio generation request for foster ID: ${fosterId}, pet: ${petName}, preview: ${previewOnly ? 'yes' : 'no'}`);
  
  if (!fosterId || !petName) {
    return res.status(400).json({ error: 'Foster ID and pet name are required' });
  }
  
  if (!transcription || transcription.trim() === '') {
    return res.status(400).json({ error: 'Transcription is required to generate a biography' });
  }

  try {
    // Process transcription to remove any personal identifiers or names
    // First remove all lines that start with AGENT:
    const filteredLines = transcription.split('\n').filter(line => !line.trim().startsWith('AGENT:'));
    const filteredTranscription = filteredLines.join('\n');
    
    // Prepare the prompt for OpenAI
    const prompt = `
    Generate a natural, conversational pet biography for ${petName} that reads like someone describing their pet to a friend. Keep it warm and engaging while still being informative.

    Length:
    - Keep the bio between 100-150 words
    - Write in a natural, flowing style

    Tone:
    - Use a warm, friendly tone while staying professional
    - Write as if you're describing the pet to a friend
    - Keep descriptions simple and relatable
    - Avoid overly formal or technical language

    Content Structure:
    - Include these key details in a natural way:
      * Size and age
      * Breed: ${breed || 'Not specified'}
      * Energy level
      * Health/vaccination status: ${vaccinated ? 'Yes' : 'No'}
      * How they get along with other pets or children
      * Their training status:
        - Leash Trained: ${leashTrained ? 'Yes' : 'No'}
        - House Trained: ${houseTrained ? 'Yes' : 'No'}
        - Spayed/Neutered: ${spayedNeutered || 'Yes'}
      * Recent medical care or spay/neuter status

    Writing Style:
    - Use natural, everyday language
    - Avoid excessive adjectives or flowery descriptions
    - Keep sentences clear and straightforward
    - Include specific examples of behavior rather than general traits
    - Help potential adopters picture life with the pet through relatable scenarios

    Additional Requirements:
    1. WRITE ONLY ABOUT THE PET. The biography must focus 100% on the pet and their needs/personality.
    2. DO NOT MENTION ANY HUMANS by name or reference.
    3. DO NOT REFER TO "CURRENT OWNERS", "CURRENT FAMILY", "FOSTER PARENTS" or any similar terms.
    4. Write in third person, focusing exclusively on ${petName}.
    5. Include these additional details: ${otherNotes || ''}
    6. CRITICAL: ANY PERSONAL NAMES in the transcript should be completely ignored.

    Adoption Information:
    - End with a friendly, encouraging call to action
    - Example: "If you're looking for a great companion, ${petName} would love to meet you! All adoptions include vaccinations, microchip, and spay/neuter."

    Remember: The biography is for potential adopters to learn about the pet in a natural, engaging way.
    `;

    console.log("Generating biography with OpenAI...");
    
    // Generate biography with OpenAI
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating pet adoption biographies. Your task is to write EXCLUSIVELY about the pet - their personality, needs, and behaviors. NEVER mention humans, caregivers, owners, or foster families in any way. The biography should focus 100% on the animal, as if no humans are involved in their life."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
    
    const generatedBio = completion.data.choices[0].message.content;
    console.log(`Successfully generated biography for ${petName}`);
    
    // If this is a preview-only request, don't update the database
    if (previewOnly) {
      console.log("Preview only request - not updating database");
      return res.status(200).json({
        biography: generatedBio,
        success: true,
        preview: true
      });
    }
    
    // Update the database with the new biography
    const result = await pool.query(
      'UPDATE fosters SET transcription = $1 WHERE id = $2 RETURNING *',
      [generatedBio, fosterId]
    );
    
    // Check if any rows were affected
    if (result.rowCount === 0) {
      console.log(`No foster found with ID: ${fosterId}`);
      return res.status(404).json({ error: `No foster found with ID: ${fosterId}` });
    }
    
    console.log(`Successfully updated database with new biography for foster ID ${fosterId}`);
    
    // Return the generated biography
    res.status(200).json({
      biography: generatedBio,
      success: true,
      preview: false
    });
  } catch (error) {
    console.error('Error generating pet biography:', error);
    res.status(500).json({ 
      error: 'Failed to generate biography', 
      message: error.message 
    });
  }
});

// Automatic background check every 5 minutes
setInterval(async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM fosters WHERE photographyneeded = true'
    );

    for (const foster of result.rows) {
      const {
        id,
        name: fosterName,
        email,
        pet_name: petName,
        phone_number: phone,
        preferred_contact_time: contactTime,
        call_id
      } = foster;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'angelsphotographyemail@gmail.com',
        subject: `Photography Needed for ${petName}`,
        text: `Hello Photography Team,\n\nA foster has completed an interview and indicated they do not have photos of their pet.\n\nFoster Info:\n• Name: ${fosterName}\n• Email: ${email}\n• Phone: ${phone}\n• Foster ID: ${id}\n• Pet Name: ${petName}\n• Preferred Contact Time: ${contactTime}\n\nPlease reach out to schedule a photography session!\n\nThank you,\nAngels Among Us Pet Rescue`
      };

      await transporter.sendMail(mailOptions);
      console.log(`Email sent for foster ID ${id} - ${fosterName}`);

      await pool.query(
        'UPDATE fosters SET photographyneeded = false, email_sent = true WHERE call_id = $1',
        [call_id]
      );
    }

  } catch (error) {
    console.error('Error in background photography email job:', error);
  }
}, 300000); // 5 minutes

// Route: Initiate a phone call using Retell API
app.post('/api/make-call', async (req, res) => {
  try {
    const { phoneNumber, fosterId } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Strip non-numeric characters from phone number
    const strippedPhoneNumber = phoneNumber.replace(/\D/g, '');
    
    // Log the request details for debugging
    console.log(`Initiating call to: +1${strippedPhoneNumber}`);
    
    try {
      // Call Retell API to initiate phone call - using axios instead of fetch
      const axios = require('axios'); // Make sure axios is installed
      console.log('Making request to Retell API with:');
      console.log(`- API Key: ${RETELL_API_KEY ? 'Present (hidden)' : 'Missing!'}`);
      console.log(`- From number: ${FROM_PHONE_NUMBER}`);
      console.log(`- To number: +1${strippedPhoneNumber}`);
      
      const response = await axios({
        method: 'POST',
        url: 'https://api.retellai.com/v2/create-phone-call',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RETELL_API_KEY}`
        },
        data: {
          from_number: FROM_PHONE_NUMBER,
          to_number: `+1${strippedPhoneNumber}`
        }
      });

      console.log('Retell API response:', JSON.stringify(response.data, null, 2));
      const callId = response.data.call_id;
      console.log(`Call initiated successfully. Call ID: ${callId}`);

      // Update foster record with call_id if fosterId is provided
      if (fosterId) {
        await pool.query(
          'UPDATE fosters SET call_id = $1 WHERE id = $2',
          [callId, fosterId]
        );
        console.log(`Updated foster ID ${fosterId} with call_id ${callId}`);
      }

      res.status(200).json({ 
        message: 'Phone call initiated successfully',
        call_id: callId
      });
    } catch (apiError) {
      console.error('Retell API error:', apiError.response?.data || apiError.message);
      return res.status(500).json({ 
        error: 'Failed to initiate call with Retell API', 
        details: apiError.response?.data || apiError.message
      });
    }
  } catch (error) {
    console.error('Error initiating phone call:', error);
    res.status(500).json({ error: 'Failed to initiate phone call' });
  }
});

// Helper function to check if current time is within preferred time range
function isWithinPreferredTime(preferredTime) {
  if (!preferredTime || !preferredTime.includes('-')) {
    return false;
  }
  
  try {
    const now = new Date();
    const currentHour = now.getHours();
    
    const [startStr, endStr] = preferredTime.split('-');
    
    // Parse times like "7AM", "10AM", "5PM" etc.
    let startHour = parseInt(startStr.replace(/[^0-9]/g, ''));
    let endHour = parseInt(endStr.replace(/[^0-9]/g, ''));
    
    // Convert to 24-hour format
    if (startStr.includes('PM') && startHour !== 12) startHour += 12;
    if (endStr.includes('PM') && endHour !== 12) endHour += 12;
    if (startStr.includes('AM') && startHour === 12) startHour = 0;
    if (endStr.includes('AM') && endHour === 12) endHour = 0;
    
    return currentHour >= startHour && currentHour <= endHour;
  } catch (error) {
    console.error(`Error parsing time range ${preferredTime}:`, error);
    return false;
  }
}

// Route: Run the foster call program
app.post('/api/run-foster-program', async (req, res) => {
  console.log('Starting foster call program');
  
  const logs = [];
  const logMessage = (message) => {
    console.log(message);
    logs.push(message);
  };
  
  try {
    logMessage("Starting program execution...");
    // Get all fosters with call_id and call_completed status
    const result = await pool.query(
      'SELECT id, call_id, phone_number, preferred_contact_time, call_completed FROM fosters ORDER BY id ASC'
    );
    
    const fosters = result.rows;
    logMessage(`Found ${fosters.length} fosters to process`);
    
    let processedCount = 0;
    
    // Process each foster
    for (const foster of fosters) {
      const { id, call_id, phone_number, preferred_contact_time, call_completed } = foster;
      logMessage(`Processing foster ID: ${id}, call_id: ${call_id}, preferred time: ${preferred_contact_time}, call_completed: ${call_completed}`);
      
      // First check if there's a call_id and try to generate biography
      if (call_id) {
        logMessage(`Found call_id for foster ID: ${id}, attempting to generate biography`);
        try {
          // Fetch call transcript using Retell SDK
          logMessage(`Attempting to fetch transcript for call_id: ${call_id}`);
          
          const callResponse = await client.call.retrieve(call_id);
          
          // Check if transcript exists and is not empty
          if (!callResponse || !callResponse.transcript) {
            logMessage(`No transcript available yet for call_id ${call_id}, skipping biography generation. API Response: ${JSON.stringify(callResponse)}`);
            continue;
          }
          
          const transcript = callResponse.transcript;
          logMessage(`Successfully retrieved transcript for call ID ${call_id}`);

          // Set photographyneeded to True only if phrase is found
          let photosNeeded = false;
          const targetPhrase = "No worries at all! We'll have a member of the photography team reach out to you to coordinate a time for photos.";
          if (transcript.includes(targetPhrase)) {
            photosNeeded = true;
            logMessage(`Photography needed flag set to True for foster ID ${id}`);
          }

          logMessage("Generating biography with GPT-4...");
          const completion = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [{
              role: "user",
              content: `Generate a 3-4 paragraph biography based on the following information. Maintain an upbeat and engaging tone. Do not fabricate details—focus on presenting the information in a positive light, even if some aspects are not inherently optimistic. Ensure clarity, coherence, and a natural flow in the writing. Ignore any lines preceded by 'AGENT:'.\n\nHere is the provided information:\n\n${transcript}`
            }]
          });
          
          const generatedBio = completion.data.choices[0].message.content;
          logMessage(`Successfully generated biography for foster ID ${id}`);
          
          // Update foster record with bio and photography flag
          await pool.query(
            'UPDATE fosters SET transcription = $1, photographyneeded = $2, call_completed = TRUE WHERE id = $3',
            [generatedBio, photosNeeded, id]
          );
          logMessage(`Successfully updated foster record with biography and photography needs`);
          processedCount++;
          
        } catch (e) {
          logMessage(`Error processing call_id ${call_id} for foster ID ${id}: ${e.message}`);
          if (e.response) {
            logMessage(`API Error Details: ${JSON.stringify(e.response)}`);
          }
          continue;
        }
      }
      // If no call_id exists, check preferred time before making a call
      else {
        const strippedPhoneNumber = phone_number.replace(/\D/g, '');
        logMessage(`No call_id found. Checking preferred time for foster ID ${id}`);
        
        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        logMessage(`Current time: ${currentTime}, Preferred time range: ${preferred_contact_time}`);
        
        if (isWithinPreferredTime(preferred_contact_time)) {
          logMessage(`Within preferred time window, initiating call...`);
          try {
            const phoneCallResponse = await client.call.create_phone_call({
              from_number: FROM_PHONE_NUMBER,
              to_number: `+1${strippedPhoneNumber}`
            });
            
            const callId = phoneCallResponse.call_id;
            logMessage(`Successfully initiated call with ID: ${callId}`);
            
            // Update foster record with call_id
            await pool.query(
              'UPDATE fosters SET call_id = $1 WHERE id = $2',
              [callId, id]
            );
            logMessage(`Successfully updated foster record with new call_id`);
            processedCount++;
          } catch (e) {
            logMessage(`Error initiating call: ${e.message}`);
            if (e.response) {
              logMessage(`API Error Details: ${JSON.stringify(e.response)}`);
            }
          }
        } else {
          logMessage(`Outside preferred time window (Current: ${currentTime}, Preferred: ${preferred_contact_time})`);
        }
      }
    }
    
    logMessage(`Program completed. Successfully processed ${processedCount} out of ${fosters.length} fosters.`);
    
    res.status(200).json({ 
      success: true, 
      message: `Program completed successfully. Processed ${processedCount} fosters.`,
      logs
    });
  } catch (error) {
    console.error('Error running foster program:', error);
    res.status(500).json({ 
      success: false, 
      error: `An error occurred: ${error.message}`,
      logs
    });
  }
});

// New endpoint: Get transcript by call ID
app.post('/api/get-transcript', async (req, res) => {
  const { call_id } = req.body;
  
  if (!call_id) {
    return res.status(400).json({ error: 'Call ID is required' });
  }
  
  try {
    // Try to retrieve the call using Retell client
    const callResponse = await client.call.retrieve(call_id);
    
    if (!callResponse || !callResponse.transcript) {
      return res.status(404).json({ error: 'No transcript available for this call ID' });
    }
    
    res.status(200).json({ transcript: callResponse.transcript });
  } catch (error) {
    console.error('Error retrieving transcript:', error);
    res.status(500).json({ error: 'Failed to retrieve transcript' });
  }
});

// New endpoint: Generate biography from transcript
app.post('/api/generate-biography', async (req, res) => {
  const { call_id } = req.body;
  
  if (!call_id) {
    return res.status(400).json({ error: 'Call ID is required' });
  }
  
  try {
    // First check if we already have a biography for this call_id
    const profileResult = await pool.query('SELECT * FROM fosters WHERE call_id = $1', [call_id]);
    const profile = profileResult.rows[0];
    
    // If we already have a transcription, return it
    if (profile && profile.transcription) {
      return res.status(200).json({ biography: profile.transcription, from_database: true });
    }
    
    // Otherwise, fetch the transcript and generate a new biography
    const callResponse = await client.call.retrieve(call_id);
    
    if (!callResponse || !callResponse.transcript) {
      return res.status(404).json({ error: 'No transcript available for this call ID' });
    }
    
    const transcript = callResponse.transcript;
    
    // Check for photography needs
    let photosNeeded = false;
    const targetPhrase = "No worries at all! We'll have a member of the photography team reach out to you to coordinate a time for photos.";
    if (transcript.includes(targetPhrase)) {
      photosNeeded = true;
    }
    
    // Generate biography with OpenAI
    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `Generate a 3-4 paragraph biography based on the following information. Maintain an upbeat and engaging tone. Do not fabricate details—focus on presenting the information in a positive light, even if some aspects are not inherently optimistic. Ensure clarity, coherence, and a natural flow in the writing. Ignore any lines preceded by 'AGENT:'.\n\nHere is the provided information:\n\n${transcript}`
      }]
    });
    
    const generatedBio = completion.data.choices[0].message.content;
    
    // If we have a profile associated with this call_id, update it
    if (profile) {
      await pool.query(
        'UPDATE fosters SET transcription = $1, photographyneeded = $2, call_completed = TRUE WHERE call_id = $3',
        [generatedBio, photosNeeded, call_id]
      );
    }
    
    res.status(200).json({ biography: generatedBio, from_database: false });
  } catch (error) {
    console.error('Error generating biography:', error);
    res.status(500).json({ error: 'Failed to generate biography' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
