from flask import Flask, render_template
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

# Serve the index page
@app.route('/')
def index():
    return render_template('index.html')

# Handle draw events sent from clients
@socketio.on('draw')
def handle_draw(data):
    # Log the drawing data received from a client
    print(f'Received drawing data: {data}')
    
    # Broadcast the drawing data to all clients (including the sender)
    emit('draw', data, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
