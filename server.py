from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash
from flask_socketio import SocketIO, emit
from flask_bcrypt import Bcrypt
import sqlite3
from models import init_db
from flask_cors import CORS
import os
from dotenv import load_dotenv
import re

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

# Connect to the database with a context manager
def get_db_connection():
    conn = sqlite3.connect('whiteboard.db', timeout=10)  # Increase timeout to 10 seconds
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return redirect(url_for('login'))  # Redirect to login page

# Serve the login page
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
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
        
    return render_template('login.html')

# Serve the dashboard page
@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        flash('Please log in to access the dashboard.', 'warning')
        return redirect(url_for('login'))

    conn = get_db_connection()
    user = conn.execute('SELECT username, email FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    whiteboards = conn.execute('SELECT name, image, timestamp FROM whiteboards WHERE user_id = ?', (session['user_id'],)).fetchall()
    conn.close()

    if user is None:
        flash('User not found.', 'danger')
        return redirect(url_for('login'))

    return render_template('dashboard.html', whiteboards=whiteboards, user=user)

# Serve the whiteboard page
@app.route('/whiteboard')
def whiteboard():
    return render_template('index.html')

# Handle drawing events from clients
@socketio.on('draw')
def handle_draw(data):
    print(f"Received drawing data: {data}")
    emit('draw', data, broadcast=True)

# @app.route('/api/whiteboards', methods=['GET'])
# def api_get_whiteboards():
#     if 'user_id' not in session:
#         return jsonify({"error": "Unauthorized"}), 403

#     conn = get_db_connection()
#     whiteboards = conn.execute('SELECT * FROM whiteboards WHERE user_id = ?', (session['user_id'],)).fetchall()
#     conn.close()

#     return jsonify([dict(whiteboard) for whiteboard in whiteboards])

@app.route('/api/whiteboards', methods=['GET'])
def api_get_whiteboards():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    with get_db_connection() as conn:  # Use a context manager here
        whiteboards = conn.execute('SELECT * FROM whiteboards WHERE user_id = ?', (session['user_id'],)).fetchall()
    return jsonify([dict(whiteboard) for whiteboard in whiteboards])

# API endpoint to save a whiteboard
# @app.route('/api/whiteboards', methods=['POST'])
# def api_save_whiteboard():
#     if 'user_id' not in session:
#         return jsonify({"error": "Unauthorized"}), 403

#     new_whiteboard = request.json

#     # Ensure the required fields are present in the request
#     if not new_whiteboard or 'name' not in new_whiteboard or 'data' not in new_whiteboard or 'image' not in new_whiteboard:
#         return jsonify({"error": "Missing fields"}), 400

#     # Save the whiteboard data to the database
#     try:
#         with get_db_connection() as conn:  # Use a context manager to ensure connection is closed
#             conn.execute("PRAGMA journal_mode=WAL;")  # Enable WAL mode
#             conn.execute('INSERT INTO whiteboards (user_id, name, data, image) VALUES (?, ?, ?, ?)', 
#                          (session['user_id'], new_whiteboard['name'], new_whiteboard['data'], new_whiteboard['image']))
#             conn.commit()
#     except sqlite3.OperationalError as e:
#         return jsonify({"error": "Database error: " + str(e)}), 500
    
#     return jsonify(new_whiteboard), 201

@app.route('/api/whiteboards', methods=['POST'])
def api_save_whiteboard():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    new_whiteboard = request.json

    if not new_whiteboard or 'name' not in new_whiteboard or 'data' not in new_whiteboard or 'image' not in new_whiteboard:
        return jsonify({"error": "Missing fields"}), 400

    try:
        with get_db_connection() as conn:  # Use a context manager to ensure connection is closed
            conn.execute("PRAGMA journal_mode=WAL;")  # Ensure WAL mode is enabled
            conn.execute('INSERT INTO whiteboards (user_id, name, data, image) VALUES (?, ?, ?, ?)', 
                         (session['user_id'], new_whiteboard['name'], new_whiteboard['data'], new_whiteboard['image']))
            conn.commit()
    except sqlite3.OperationalError as e:
        return jsonify({"error": "Database error: " + str(e)}), 500
    
    return jsonify(new_whiteboard), 201

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        email = request.form['email']

        if not is_email_valid(email):
            flash('Invalid email format. Please enter a valid email address.', 'danger')
            return redirect(url_for('signup'))

        if not is_password_valid(password):
            flash('Password must be at least 8 characters long, include an uppercase letter, a digit, and a special character.', 'danger')
            return redirect(url_for('signup'))

        if password != confirm_password:
            flash('Passwords do not match. Please try again.', 'danger')
            return redirect(url_for('signup'))

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        conn = get_db_connection()
        try:
            user_check = conn.execute('SELECT * FROM users WHERE username = ? OR email = ?', (username, email)).fetchone()
            if user_check:
                flash('Username or email already exists. Please choose a different one.', 'danger')
                return redirect(url_for('signup'))

            conn.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', (username, email, hashed_password))
            conn.commit()
            flash('Signup successful! Please log in.', 'success')
            return redirect(url_for('login'))
        except sqlite3.Error as e:
            flash(f'An error occurred: {e}', 'danger')
        finally:
            conn.close()

    return render_template('signup.html')

@app.route('/sign_out')
def sign_out():
    session.clear()
    return redirect(url_for('login'))

# Function to validate password complexity
def is_password_valid(password):
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False
    return True

# Function to validate email format
def is_email_valid(email):
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(email_regex, email)

if __name__ == '__main__':
    socketio.run(app, debug=True)
