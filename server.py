from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

# Serve the dashboard page
@app.route('/')
def dashboard():
    return render_template('dashboard.html')

# Serves the index page
@app.route('/whiteboard')
def whiteboard():
    return render_template('index.html')

# Handle draw events sent from clients
@socketio.on('draw')
def handle_draw(data):
    # Log the drawing data print(f"Received drawing data: {data}")
    print(f"Received drawing data: {data}")

    # Broadcast the drawing data to all connected clients
    emit('draw', data, broadcast=True, include_self=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
