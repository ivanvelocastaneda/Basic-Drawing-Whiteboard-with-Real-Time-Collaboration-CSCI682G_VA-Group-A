from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash
from flask_socketio import SocketIO, emit
from flask_bcrypt import Bcrypt
import sqlite3
from models import init_db
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv  # Import this
import re  # Import the 're' module for regular expressions
import time

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY')  # Use the secret key from .env
socketio = SocketIO(app)
bcrypt = Bcrypt(app)

# Apply Cross-Origin Resource Sharing (CORS)
CORS(app)

# Initialize the database
init_db()

# Sample data structure to store whiteboards
saved_whiteboards = []

# Retrieve saved whiteboards from the global variable
def get_saved_whiteboards():
    return saved_whiteboards

# Connect to the database
def get_db_connection():
    conn = sqlite3.connect('whiteboard.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('dashboard.html')

# Serve the dashboard page
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('Please log in to access the dashboard.', 'warning')
        return redirect(url_for('login'))

    conn = get_db_connection()
    user = conn.execute('SELECT username, email FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    conn.close()

    saved_whiteboards = get_saved_whiteboards()  # You might want to fetch this from the database as well
    return render_template('dashboard.html', whiteboards=saved_whiteboards, user=user)


# Serve the whiteboard page
@app.route('/whiteboard')
def whiteboard():
    return render_template('index.html')

# Handle drawing events from clients
@socketio.on('draw')
def handle_draw(data):
    print(f"Received drawing data: {data}")
    # Broadcast the drawing data to all clients
    emit('draw', data, broadcast=True)

# API endpoint to get saved whiteboards
@app.route('/api/whiteboards', methods=['GET'])
def api_get_whiteboards():
    return jsonify(saved_whiteboards)

# API endpoint to save a whiteboard
@app.route('/api/whiteboards', methods=['POST'])
def api_save_whiteboard():
    new_whiteboard = request.json
    # Adds a timestamp to the whiteboard before saving
    new_whiteboard['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    saved_whiteboards.append(new_whiteboard)
    return jsonify(new_whiteboard), 201

# Function to validate password complexity
def is_password_valid(password):
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):  # At least one uppercase letter
        return False
    if not re.search(r"[0-9]", password):  # At least one digit
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):  # At least one special character
        return False
    return True

# Function to validate email format
def is_email_valid(email):
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(email_regex, email)

# Signup route
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        email = request.form['email']

        # Validate email format
        if not is_email_valid(email):
            flash('Invalid email format. Please enter a valid email address.', 'danger')
            return redirect(url_for('signup'))

        # Validate password complexity
        if not is_password_valid(password):
            flash('Password must be at least 8 characters long, include an uppercase letter, a digit, and a special character.', 'danger')
            return redirect(url_for('signup'))

        # Check if passwords match
        if password != confirm_password:
            flash('Passwords do not match. Please try again.', 'danger')
            return redirect(url_for('signup'))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')  # Use bcrypt to hash the password

        conn = get_db_connection()
        try:
            # Check for existing username or email
            user_check = conn.execute('SELECT * FROM users WHERE username = ? OR email = ?', (username, email)).fetchone()
            if user_check:
                flash('Username or email already exists. Please choose a different one.', 'danger')
                return redirect(url_for('signup'))

            # Insert new user
            conn.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', (username, email, hashed_password))
            conn.commit()
            flash('Signup successful! Please log in.', 'success')  # Flash success message
            return redirect(url_for('login'))
        except sqlite3.Error as e:
            flash(f'An error occurred: {e}', 'danger')
        finally:
            conn.close()

    return render_template('signup.html')

# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()

        if user and bcrypt.check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            flash('Login successful!', 'success')  # Flash message for dashboard
            return redirect(url_for('dashboard'))  # Redirect to dashboard on success
        else:
            flash('Invalid username or password.', 'danger')
        
    return render_template('login.html')


@app.route('/sign_out')
def sign_out():
    session.clear()  # Clear the session to reset login state
    return redirect(url_for('login'))  # Redirect to login page without a flash message




if __name__ == '__main__':
    socketio.run(app, debug=True)
