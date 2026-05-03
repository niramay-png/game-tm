from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import csv
import json
import os
import hashlib
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

app = Flask(__name__)
# Allow CORS for all origins to ensure Netlify can connect to the local/live backend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Replace this with your actual Google Client ID from Google Cloud Console
GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"

DB_FILE = 'database.db'
CSV_FILE = 'users_data.csv'

def hash_password(password):
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            name TEXT,
            enrollment TEXT,
            course TEXT,
            password_hash TEXT,
            total_score INTEGER DEFAULT 0,
            mental_score INTEGER DEFAULT 0,
            physical_score INTEGER DEFAULT 0,
            played_ids TEXT DEFAULT '[]'
        )
    ''')
    conn.commit()
    conn.close()

def export_to_csv():
    """Syncs the SQL database to an Excel-compatible CSV file."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT email, name, enrollment, course, total_score, mental_score, physical_score, played_ids FROM users')
    rows = cursor.fetchall()

    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Email', 'Name', 'Enrollment', 'Course', 'Total Score', 'Mental Score', 'Physical Score', 'Played Question IDs'])
        writer.writerows(rows)
    conn.close()

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    enrollment = data.get('enrollment', '').strip().upper()
    course = data.get('course', '').strip()  # optional
    password = data.get('password', '').strip()

    # Server-side email domain check
    if not email.endswith('@gsfcuniversity.ac.in'):
        return jsonify({'status': 'error', 'message': 'Only GSFC University email IDs are allowed (@gsfcuniversity.ac.in)'}), 403

    if not all([name, email, enrollment, password]):
        return jsonify({'status': 'error', 'message': 'All fields are required.'}), 400

    if len(password) < 6:
        return jsonify({'status': 'error', 'message': 'Password must be at least 6 characters.'}), 400

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('SELECT email FROM users WHERE email = ?', (email,))
    existing = cursor.fetchone()

    if existing:
        conn.close()
        return jsonify({'status': 'error', 'message': 'This email is already registered. Please log in.'}), 409

    password_hash = hash_password(password)
    cursor.execute('''
        INSERT INTO users (email, name, enrollment, course, password_hash, total_score, mental_score, physical_score, played_ids)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, '[]')
    ''', (email, name, enrollment, course, password_hash))
    conn.commit()
    conn.close()

    export_to_csv()
    return jsonify({
        'status': 'success',
        'email': email,
        'name': name,
        'enrollment': enrollment,
        'course': course,
        'total_score': 0,
        'mental_score': 0,
        'physical_score': 0,
        'played_ids': []
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    identifier = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    is_session = data.get('_session', False)

    # Check if the input is an email or enrollment ID
    if '@' in identifier:
        if not identifier.endswith('@gsfcuniversity.ac.in'):
            return jsonify({'status': 'error', 'message': 'Only GSFC University email IDs are allowed.'}), 403
        query = 'SELECT * FROM users WHERE email = ?'
    else:
        # Treat as Enrollment ID
        query = 'SELECT * FROM users WHERE UPPER(enrollment) = ?'
        identifier = identifier.upper()

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(query, (identifier,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        msg = 'No account found with this email. Please sign up first.' if '@' in identifier else 'No account found with this Enrollment ID.'
        return jsonify({'status': 'error', 'message': msg}), 404

    # Skip password check for auto-login sessions
    if not is_session:
        password_hash = hash_password(password)
        print(f"DEBUG: Login attempt for {identifier}")
        print(f"DEBUG: Calculated hash: {password_hash}")
        print(f"DEBUG: Stored hash:     {user[4]}")
        if user[4] != password_hash:
            print(f"DEBUG: Password mismatch for {identifier}")
            return jsonify({'status': 'error', 'message': 'Incorrect password. Please try again.'}), 401
        print(f"DEBUG: Password match for {identifier}")

    user_data = {
        'status': 'success',
        'email': user[0],
        'name': user[1],
        'enrollment': user[2],
        'course': user[3],
        'total_score': user[5],
        'mental_score': user[6],
        'physical_score': user[7],
        'played_ids': json.loads(user[8]) if user[8] else []
    }
    export_to_csv()
    return jsonify(user_data)

@app.route('/api/google-login', methods=['POST'])
def google_login():
    data = request.json
    token = data.get('token')
    
    if not token:
        return jsonify({'status': 'error', 'message': 'No Google token provided.'}), 400

    try:
        # Verify the Google ID Token
        # Note: In a production app, you'd want to handle the CLIENT_ID securely (e.g., from an environment variable)
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)

        # Check hosted domain (hd) - this is the core requirement
        hd = idinfo.get('hd')
        email = idinfo.get('email', '').lower()
        name = idinfo.get('name', 'Student')
        
        # Security: Enforce the university domain check
        if hd != 'gsfcuniversity.ac.in' and not email.endswith('@gsfcuniversity.ac.in'):
            return jsonify({'status': 'error', 'message': 'Unauthorized. Only GSFC University accounts are permitted.'}), 403

        # Check if user exists, otherwise create
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()

        if not user:
            # Create a dummy enrollment ID from email if not present
            enrollment = email.split('@')[0].upper()
            cursor.execute('''
                INSERT INTO users (email, name, enrollment, course, password_hash, total_score, mental_score, physical_score, played_ids)
                VALUES (?, ?, ?, ?, ?, 0, 0, 0, '[]')
            ''', (email, name, enrollment, 'GSFC Student', 'GOOGLE_AUTH'))
            conn.commit()
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()

        conn.close()

        user_data = {
            'status': 'success',
            'email': user[0],
            'name': user[1],
            'enrollment': user[2],
            'course': user[3],
            'total_score': user[5],
            'mental_score': user[6],
            'physical_score': user[7],
            'played_ids': json.loads(user[8]) if user[8] else []
        }
        export_to_csv()
        return jsonify(user_data)

    except ValueError as e:
        print(f"Token verification failed: {e}")
        return jsonify({'status': 'error', 'message': 'Invalid Google token.'}), 401
    except Exception as e:
        print(f"Server error during Google login: {e}")
        return jsonify({'status': 'error', 'message': 'Internal server error.'}), 500

@app.route('/api/update', methods=['POST'])
def update_score():
    data = request.json
    email = data.get('email', '').strip().lower()
    total_score = data.get('total_score')
    mental_score = data.get('mental_score')
    physical_score = data.get('physical_score')
    played_ids = data.get('played_ids', [])

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users
        SET total_score = ?, mental_score = ?, physical_score = ?, played_ids = ?
        WHERE email = ?
    ''', (total_score, mental_score, physical_score, json.dumps(played_ids), email))
    conn.commit()
    conn.close()

    export_to_csv()
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    init_db()
    export_to_csv()
    print("--------------------------------------------------")
    print("Backend server is running on http://127.0.0.1:5000")
    print(f"Live SQL data is being synced to CSV: {CSV_FILE}")
    print("Only @gsfcuniversity.ac.in emails are accepted.")
    print("--------------------------------------------------")
    app.run(host='0.0.0.0', debug=True, port=5000)
