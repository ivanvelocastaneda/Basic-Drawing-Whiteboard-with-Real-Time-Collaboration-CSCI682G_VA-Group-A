from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
socketio = SocketIO(app)

# Apply Cross-Origin Resource Sharing (CORS)
CORS(app)

# Sample data structure to store whiteboards
saved_whiteboards = []

# Retrieve saved whiteboards from the global variable
def get_saved_whiteboards():
    return saved_whiteboards

@app.route('/')
def index():
    return render_template('dashboard.html')

# Serve the dashboard page
@app.route('/dashboard')
def dashboard():
    saved_whiteboards = get_saved_whiteboards()
    return render_template('dashboard.html', whiteboards=saved_whiteboards)

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

if __name__ == '__main__':
    socketio.run(app, debug=True)
