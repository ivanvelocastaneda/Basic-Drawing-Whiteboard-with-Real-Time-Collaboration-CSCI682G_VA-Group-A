from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash
from flask_wtf.csrf import CSRFProtect
from marshmallow import Schema, fields, ValidationError
import logging
from flask_socketio import SocketIO, emit, join_room, leave_room
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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
csrf = CSRFProtect(app)

# Define the schema for input validation
class WhiteboardSchema(Schema):
    name = fields.Str(required=True)
    data = fields.Str(required=True)
    image = fields.Str(required=True)
    timestamp = fields.DateTime(required=True)

whiteboard_schema = WhiteboardSchema()

# Handle 404 errors
@app.errorhandler(404)
def not_found_error(error):
    logging.error(f"404 Not Found: {error}", exc_info=True)
    return jsonify({"error": "Not found."}), 404

# Global error handler for other exceptions
@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"An error occurred: {e}", exc_info=True)
    return jsonify({"error": "An internal error occurred."}), 500

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
def redirect_to_login():
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
    whiteboards = conn.execute('SELECT id, name, image, timestamp FROM whiteboards WHERE user_id = ?', (session['user_id'],)).fetchall()
    conn.close()

    if user is None:
        flash('User  not found.', 'danger')
        return redirect(url_for('login'))

    return render_template('dashboard.html', whiteboards=whiteboards, user=user)

# Serve the index page
@app.route('/index')
def serve_index():
    if 'user_id' not in session:
        flash('Please log in to access the whiteboard.', 'warning')
        return redirect(url_for('login'))

    # Fetch the username from the database
    conn = get_db_connection()
    user = conn.execute('SELECT username FROM users WHERE id = ?', (session['user_id'],)).fetchone()

    # Initialize default whiteboard name
    whiteboard_name = "Untitled"

    # Check if whiteboardId is provided in the query parameters
    whiteboard_id = request.args.get('whiteboardId')
    if whiteboard_id:
        # Fetch the specific whiteboard details
        whiteboard = conn.execute('SELECT name FROM whiteboards WHERE id = ? AND user_id = ?', (whiteboard_id, session['user_id'])).fetchone()
        if whiteboard:
            whiteboard_name = whiteboard['name']  # Use the fetched name

    conn.close()

    if user is None:
        flash('User  not found.', 'danger')
        return redirect(url_for('login'))

    return render_template('index.html', username=user['username'], whiteboard_name=whiteboard_name)

# Serve the whiteboard page
@app.route('/whiteboard')
def whiteboard():
    if 'user_id' not in session:
        flash('Please log in to access the whiteboard.', 'warning')
        return redirect(url_for('login'))

    # Fetch the username, name and email from the database
    conn = get_db_connection()
    user = conn.execute('SELECT username FROM users WHERE id = ?', (session['user_id'],)).fetchone()

    # Initialize default whiteboard name
    whiteboard_name = "Untitled"

    # Check if whiteboardId is provided in the query parameters
    whiteboard_id = request.args.get('whiteboardId')
    if whiteboard_id:
        # Fetch the specific whiteboard details
        whiteboard = conn.execute('SELECT name FROM whiteboards WHERE id = ? AND user_id = ?', (whiteboard_id, session['user_id'])).fetchone()
        if whiteboard:
            whiteboard_name = whiteboard['name']  # Use the fetched name
    conn.close()

    if user is None:
        flash('User  not found.', 'danger')
        return redirect(url_for('login'))

    return render_template('index.html', username=user['username'], whiteboard_id=whiteboard_id, whiteboard_name=whiteboard_name)

@socketio.on('draw')
def handle_draw(data):
    user_id = data['user_id']
    emit('draw', data, room=user_id)  # Emit to the user's room only

# Retrieve all whiteboards
@app.route('/api/whiteboards', methods=['GET'])
def api_get_whiteboards():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    with get_db_connection() as conn:
        whiteboards = conn.execute('SELECT * FROM whiteboards WHERE user_id = ?', (session['user_id'],)).fetchall()
    return jsonify([dict(whiteboard) for whiteboard in whiteboards])

# Save a new whiteboard
@app.route('/api/whiteboards', methods=['POST'])
def api_save_whiteboard():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    new_whiteboard = request.json

    # Validate input using Marshmallow schema
    try:
        validated_data = whiteboard_schema.load(new_whiteboard)
    except ValidationError as err:
        return jsonify({"error": err.messages}), 400

    try:
        with get_db_connection() as conn:
            conn.execute("PRAGMA journal_mode=WAL ;")
            conn.execute('INSERT INTO whiteboards (user_id, name, data, image, timestamp) VALUES (?, ?, ?, ?, ?)', 
                         (session['user_id'], validated_data['name'], validated_data['data'], validated_data['image'], validated_data['timestamp']))
            conn.commit()
    except sqlite3.OperationalError as e:
        return jsonify({"error": "Database error: " + str(e)}), 500
    
    return jsonify(validated_data), 201

# Delete a specific whiteboard
@app.route('/api/whiteboards/<int:whiteboard_id>', methods=['DELETE'])
def api_delete_whiteboard(whiteboard_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    try:
        with get_db_connection() as conn:
            result = conn.execute('DELETE FROM whiteboards WHERE id = ? AND user_id = ?', (whiteboard_id, session['user_id']))
            if result.rowcount == 0:
                return jsonify({"error": "Whiteboard not found or not authorized"}), 404
            conn.commit()
    except sqlite3.OperationalError as e:
        return jsonify({"error": "Database error: " + str(e)}), 500

    return jsonify({"message": "Whiteboard deleted"}), 200

# Load a specific whiteboard
@app.route('/api/whiteboards/<int:whiteboard_id>', methods=['GET'])
def api_load_whiteboard(whiteboard_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    with get_db_connection() as conn:
        whiteboard = conn.execute('SELECT * FROM whiteboards WHERE id = ? AND user_id = ?', (whiteboard_id, session['user_id'])).fetchone()
        if whiteboard is None:
            return jsonify({"error": "Whiteboard not found"}), 404
    
    return jsonify(dict(whiteboard))

# Update a specific whiteboard
@app.route('/api/whiteboards/<int:whiteboard_id>', methods=['PUT'])
def api_update_whiteboard(whiteboard_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 403

    updated_whiteboard = request.json

    # Validate input using Marshmallow schema
    try:
        validated_data = whiteboard_schema.load(updated_whiteboard)
    except ValidationError as err:
        return jsonify({"error": err.messages}), 400

    try:
        with get_db_connection() as conn:
            conn.execute("PRAGMA journal_mode=WAL ;")
            # Update the existing whiteboard
            result = conn.execute(
                'UPDATE whiteboards SET name = ?, data = ?, image = ?, timestamp = ? WHERE id = ? AND user_id = ?',
                (validated_data['name'], validated_data['data'], validated_data['image'], validated_data['timestamp'], whiteboard_id, session['user_id'])
            )
            conn.commit()

            if result.rowcount == 0:
                return jsonify({"error": "Whiteboard not found or not authorized"}), 404
    except sqlite3.OperationalError as e:
        return jsonify({"error": "Database error: " + str(e)}), 500

    return jsonify(validated_data), 200

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

@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id')
    join_room(user_id)  # Join a room based on user ID
    emit('user_connected', {'user_id': user_id}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)