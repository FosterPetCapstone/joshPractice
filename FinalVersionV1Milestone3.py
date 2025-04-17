import openai
import psycopg2
from retell import Retell
from dotenv import load_dotenv
import os
import re
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
from flask_cors import CORS
import psycopg2.extras
import sys

# Load environment variables
load_dotenv()

# Initialize OpenAI and Retell clients
openai.api_key = os.getenv("OPENAI")
client = Retell(api_key=os.getenv("RETELL"))

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:19006", "http://localhost:8080", "http://localhost:8081"]}})
logs = []

def is_within_preferred_time(preferred_time):
    if not preferred_time or '-' not in preferred_time:
        return False
    try:
        current_time = datetime.now().strftime('%H:%M')
        start_time_str, end_time_str = preferred_time.split('-')
        start_time = datetime.strptime(start_time_str.strip(), '%I%p').strftime('%H:%M')
        end_time = datetime.strptime(end_time_str.strip(), '%I%p').strftime('%H:%M')
        return start_time <= current_time <= end_time
    except Exception as e:
        log(f"Error parsing time range {preferred_time}: {e}")
        return False

def run_program():
    global logs
    logs = []
    processed_count = 0
    try:
        log("Starting program execution...")
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port="5432"
        )
        log("Database connection successful")
        
        cursor = connection.cursor()
        cursor.execute('SELECT "id", "call_id", "phone_number", "preferred_contact_time", "call_completed" FROM "fosters" ORDER BY "id" ASC;')
        fosters = cursor.fetchall()
        
        log(f"Found {len(fosters)} fosters to process")
        
        for foster in fosters:
            foster_id, call_id, phone_number, preferred_contact_time, call_completed = foster
            log(f"Processing foster ID: {foster_id}, call_id: {call_id}, preferred time: {preferred_contact_time}, call_completed: {call_completed}")
            
            # First check if there's a call_id and handle biography generation
            if call_id and not call_completed:  # Only process if we have a call_id but haven't completed processing
                log(f"Found unprocessed call_id for foster ID: {foster_id}")
                try:
                    # Try to retrieve the call first to verify it exists and has a transcript
                    call_response = client.call.retrieve(call_id)
                    if not hasattr(call_response, 'transcript') or not call_response.transcript:
                        log(f"No transcript available yet for call_id {call_id}, skipping biography generation")
                        continue
                        
                    transcript = call_response.transcript
                    log(f"Successfully retrieved transcript for call ID {call_id}")

                    # Set photographyneeded to True only if phrase is found
                    photos_needed = False
                    target_phrase = "No worries at all! We'll have a member of the photography team reach out to you to coordinate a time for photos."
                    if target_phrase in transcript:
                        photos_needed = True
                        log(f"Photography needed flag set to True for foster ID {foster_id}")

                    log("Generating biography with GPT-4...")
                    completion = openai.ChatCompletion.create(
                        model="gpt-4",
                        messages=[{
                            "role": "user",
                            "content": f"""Generate a persuasive pet biography (2-3 paragraphs) using the following structured approach. Focus on maximizing adoption likelihood through clear, analytical language.

Key Requirements:
- Use formal, factual tone with minimal emotional language
- Minimize personal pronouns and humanizing descriptors
- Include concrete details about size, age, breed, energy level, health status, and compatibility
- Focus on specific behaviors and training status
- Use future-oriented language to help adopters envision life with the pet
- Maintain clarity and natural flow while presenting information analytically
- Avoid fabricating details - use only provided information
- Ignore any lines preceded by 'AGENT:'

Based on this information, create a structured biography that emphasizes practical attributes and adoption readiness:

{transcript}

End the biography with a clear adoption call-to-action regarding next steps."""
                        }]
                    )

                    generated_bio = completion.choices[0].message['content']
                    log(f"Successfully generated biography for foster ID {foster_id}")

                    cursor.execute(
                        """
                        UPDATE "fosters"
                        SET "transcription" = %s, "photographyneeded" = %s, "call_completed" = TRUE
                        WHERE "id" = %s;
                        """,
                        (generated_bio, photos_needed, foster_id)
                    )
                    log(f"Successfully updated foster record with biography and photography needs")
                    processed_count += 1

                except Exception as e:
                    log(f"Error processing call_id {call_id} for foster ID {foster_id}: {str(e)}")
                    if hasattr(e, '__dict__'):
                        log(f"Detailed error information: {str(e.__dict__)}")
            
            # If no call_id exists, check preferred time before making a call
            elif not call_id:
                stripped_phone_number = re.sub(r'\D', '', phone_number)
                log(f"Checking preferred time for foster ID {foster_id}")
                
                current_time = datetime.now().strftime('%H:%M')
                log(f"Current time: {current_time}, Preferred time range: {preferred_contact_time}")
                
                if is_within_preferred_time(preferred_contact_time):
                    log(f"Within preferred time window, initiating call...")
                    try:
                        phone_call_response = client.call.create_phone_call(
                            from_number="+18446060918",
                            to_number=f"+1{stripped_phone_number}"
                        )
                        call_id = phone_call_response.call_id
                        log(f"Successfully initiated call with ID: {call_id}")

                        cursor.execute(
                            """
                            UPDATE "fosters"
                            SET "call_id" = %s
                            WHERE "id" = %s;
                            """,
                            (call_id, foster_id)
                        )
                        log(f"Successfully updated foster record with new call_id")
                        processed_count += 1
                    except Exception as e:
                        log(f"Error initiating call: {str(e)}")
                        if hasattr(e, '__dict__'):
                            log(f"Detailed error information: {str(e.__dict__)}")
                else:
                    log(f"Outside preferred time window (Current: {current_time}, Preferred: {preferred_contact_time})")
            else:
                log(f"Skipping foster ID {foster_id} - already processed")

        connection.commit()
        log(f"Program completed. Successfully processed {processed_count} out of {len(fosters)} fosters.")
        connection.close()
        return True
    except Exception as e:
        log(f"Critical error in run_program: {str(e)}")
        if hasattr(e, '__dict__'):
            log(f"Detailed error information: {str(e.__dict__)}")
        if 'connection' in locals():
            connection.close()
        return False

def log(message):
    print(message)
    logs.append(message)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run', methods=['POST'])
def run():
    success = run_program()
    return jsonify({'success': success, 'logs': logs})

@app.route('/logs')
def get_logs():
    return jsonify({'logs': logs})

@app.route('/api/run-foster-program', methods=['POST'])
def run_foster_program():
    success = run_program()
    return jsonify({'success': success, 'logs': logs})

@app.route('/api/generate-pet-bio', methods=['POST'])
def generate_pet_bio():
    try:
        # Parse the request data
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        foster_id = data.get('fosterId')  
        pet_name = data.get('petName', '')
        transcription = data.get('transcription', '')
        species = data.get('species', 'Not specified')
        breed = data.get('breed', 'Not specified')
        vaccinated = 'Yes' if data.get('vaccinated') else 'No'
        leash_trained = 'Yes' if data.get('leashTrained') else 'No'
        house_trained = 'Yes' if data.get('houseTrained') else 'No'
        available_for_adoption = data.get('availableForAdoption', 'Yes')
        spayed_neutered = data.get('spayedNeutered', 'Yes')
        other_notes = data.get('otherNotes', '')
        preview_only = data.get('previewOnly', False)
        
        log(f"Received bio generation request for foster ID: {foster_id}, pet: {pet_name}, preview_only: {preview_only}")
        
        if not foster_id or not pet_name:
            return jsonify({'error': 'Foster ID and pet name are required'}), 400
            
        if not transcription or transcription.strip() == '':
            return jsonify({'error': 'Transcription is required to generate a biography'}), 400
        
        # Process transcription to remove any personal identifiers or names
        # First remove all lines that start with AGENT:
        filtered_lines = []
        for line in transcription.split('\n'):
            if not line.strip().startswith('AGENT:'):
                filtered_lines.append(line)
        
        # Join the lines back together
        filtered_transcription = '\n'.join(filtered_lines)
        
        # Prepare the prompt for OpenAI
        prompt = f"""
        Generate a pet adoption biography for {pet_name} using these specific guidelines:

        1. WRITE ONLY ABOUT THE PET. The biography must focus 100% on the pet and their needs/personality.
        2. DO NOT MENTION ANY HUMANS by name or reference.
        3. DO NOT REFER TO "CURRENT OWNERS", "CURRENT FAMILY", "FOSTER PARENTS" or any similar terms.
        4. Write in third person, focusing exclusively on {pet_name}.
        5. Create 3-4 paragraphs highlighting personality, habits, and potential as a pet.
        6. Include factual details about medical status and training:
           - Species: {species}
           - Breed: {breed}
           - Vaccinated: {vaccinated}
           - Leash Trained: {leash_trained}
           - House Trained: {house_trained}
           - Spayed/Neutered: {spayed_neutered}
        7. If {available_for_adoption} is "Yes", end with an adoption appeal.
        8. Include these additional details: {other_notes}
        9. CRITICAL: ANY PERSONAL NAMES in the transcript should be completely ignored.

        Remember: The biography is for potential adopters to learn ONLY about the pet.
        """
        
        log("Generating biography with OpenAI...")
        
        # Generate the biography using OpenAI
        completion = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are creating pet adoption biographies. Your task is to write EXCLUSIVELY about the pet - their personality, needs, and behaviors. NEVER mention humans, caregivers, owners, or foster families in any way. The biography should focus 100% on the animal, as if no humans are involved in their life."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        generated_bio = completion.choices[0].message['content']
        log(f"Successfully generated biography for {pet_name}")
        
        # If this is a preview-only request, don't update the database
        if preview_only:
            log("Preview only request - not updating database")
            return jsonify({
                'biography': generated_bio,
                'success': True,
                'preview': True
            })
        
        # Otherwise, update the database with the new biography
        try:
            connection = psycopg2.connect(
                host=os.getenv("DB_HOST"),
                database=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                port="5432"
            )
            cursor = connection.cursor()
            
            cursor.execute(
                """
                UPDATE "fosters"
                SET "transcription" = %s
                WHERE "id" = %s;
                """,
                (generated_bio, foster_id)
            )
            
            connection.commit()
            connection.close()
            log(f"Successfully updated database with new biography for foster ID {foster_id}")
            
            # Return the generated biography
            return jsonify({
                'biography': generated_bio,
                'success': True,
                'preview': False
            })
            
        except Exception as db_error:
            log(f"Database error: {str(db_error)}")
            return jsonify({
                'error': 'Database error',
                'message': str(db_error)
            }), 500
            
    except Exception as e:
        log(f"Error generating pet biography: {str(e)}")
        return jsonify({
            'error': 'Failed to generate biography',
            'message': str(e)
        }), 500

@app.route('/api/save-pet-bio', methods=['POST'])
def save_pet_bio():
    try:
        # Parse the request data
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        foster_id = data.get('fosterId')
        biography = data.get('biography')
        
        log(f"Received request to save biography for foster ID: {foster_id}")
        log(f"Biography length: {len(biography) if biography else 0} characters")
        
        if not foster_id:
            return jsonify({'error': 'Foster ID is required'}), 400
        
        if not biography or biography.strip() == '':
            return jsonify({'error': 'Biography text is required'}), 400
        
        # Update the database with the provided biography
        try:
            connection = psycopg2.connect(
                host=os.getenv("DB_HOST"),
                database=os.getenv("DB_NAME"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                port="5432"
            )
            cursor = connection.cursor()
            
            log(f"Executing database update for foster ID: {foster_id}")
            cursor.execute(
                """
                UPDATE "fosters"
                SET "transcription" = %s
                WHERE "id" = %s
                RETURNING *;
                """,
                (biography, foster_id)
            )
            
            # Check if any rows were affected
            updated_row = cursor.fetchone()
            if not updated_row:
                connection.close()
                log(f"No foster found with ID: {foster_id}")
                return jsonify({'error': f'No foster found with ID: {foster_id}'}), 404
            
            connection.commit()
            connection.close()
            log(f"Successfully saved biography for foster ID {foster_id}")
            
            # Return success response
            return jsonify({
                'success': True,
                'message': 'Biography saved successfully'
            })
            
        except Exception as db_error:
            log(f"Database error: {str(db_error)}")
            return jsonify({
                'error': 'Database error',
                'message': str(db_error)
            }), 500
            
    except Exception as e:
        log(f"Error in /api/save-pet-bio: {str(e)}")
        return jsonify({
            'error': 'Failed to process request',
            'message': str(e)
        }), 500

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    try:
        connection = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            port="5432"
        )
        cursor = connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Query fosters ordered by ID in ascending order
        cursor.execute('SELECT * FROM fosters ORDER BY id ASC')
        
        # Fetch all results as dictionaries
        profiles = [dict(row) for row in cursor.fetchall()]
        
        connection.close()
        
        return jsonify(profiles)
    except Exception as e:
        log(f"Error fetching profiles: {str(e)}")
        return jsonify({'error': 'Failed to fetch profiles', 'message': str(e)}), 500

@app.route('/api/test', methods=['GET'])
def test_api():
    """Simple endpoint to test if the API is running and accessible."""
    return jsonify({
        'status': 'success',
        'message': 'API is running and accessible',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == "__main__":
    # Create templates directory if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Create the HTML template file
    with open('templates/index.html', 'w') as f:
        f.write('''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Foster Call System</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .btn {
            background-color: #4CAF50;
            color: white;
            padding: 14px 20px;
            margin: 20px auto;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: block;
            width: 200px;
            text-align: center;
        }
        .btn:hover {
            background-color: #45a049;
        }
        .btn:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }
        .log-container {
            margin-top: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            height: 300px;
            overflow-y: auto;
            background-color: #f9f9f9;
        }
        .log-entry {
            margin: 5px 0;
            font-family: monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .status {
            text-align: center;
            margin-top: 10px;
            font-weight: bold;
        }
        .success {
            color: green;
        }
        .error {
            color: red;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Foster Call System</h1>
        <button id="runButton" class="btn">Run Program</button>
        <div id="status" class="status"></div>
        <div class="log-container" id="logContainer"></div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const runButton = document.getElementById('runButton');
            const logContainer = document.getElementById('logContainer');
            const statusElement = document.getElementById('status');

            runButton.addEventListener('click', async function() {
                // Clear previous logs and status
                logContainer.innerHTML = '';
                statusElement.textContent = 'Running...';
                statusElement.className = 'status';
                runButton.disabled = true;

                try {
                    console.log('Sending request to run foster program...');
                    const response = await fetch('/api/run-foster-program', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('Received response:', data);
                    
                    // Update status
                    if (data.success) {
                        statusElement.textContent = 'Program ran successfully!';
                        statusElement.className = 'status success';
                    } else {
                        statusElement.textContent = 'Program completed with errors.';
                        statusElement.className = 'status error';
                    }
                    
                    // Display logs
                    if (Array.isArray(data.logs)) {
                        data.logs.forEach(log => {
                            const logEntry = document.createElement('div');
                            logEntry.className = 'log-entry';
                            logEntry.textContent = log;
                            logContainer.appendChild(logEntry);
                        });
                        
                        // Scroll to bottom of logs
                        logContainer.scrollTop = logContainer.scrollHeight;
                    } else {
                        console.error('Invalid logs format:', data.logs);
                        const logEntry = document.createElement('div');
                        logEntry.className = 'log-entry';
                        logEntry.textContent = 'Error: Invalid log format received';
                        logContainer.appendChild(logEntry);
                    }
                    
                } catch (error) {
                    console.error('Error running program:', error);
                    statusElement.textContent = 'Error: ' + error.message;
                    statusElement.className = 'status error';
                    
                    const logEntry = document.createElement('div');
                    logEntry.className = 'log-entry';
                    logEntry.textContent = 'Error: ' + error.message;
                    logContainer.appendChild(logEntry);
                } finally {
                    runButton.disabled = false;
                }
            });
        });
    </script>
</body>
</html>
        ''')
    
    # Print debug information
    print("\n=== Flask App Debug Information ===")
    print(f"Python version: {sys.version}")
    print(f"OpenAI API key configured: {'Yes' if os.getenv('OPENAI') else 'No'}")
    print(f"Database connection configured: {'Yes' if os.getenv('DB_HOST') else 'No'}")
    
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods - {'OPTIONS', 'HEAD'}))
        print(f"{methods:20s} {rule}")
    
    # Run the app on port 8080 to match frontend API calls
    print("\nStarting Flask server on port 8080...")
    app.run(debug=True, host='0.0.0.0', port=8080)
