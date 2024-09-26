// Initialize socket.io connection
var socket = io();

// Get canvas and set up context for drawing
var canvas = document.getElementById("whiteboard");
var context = canvas.getContext("2d");
var drawing = false;

// Start drawing
canvas.addEventListener("mousedown", function (e) {
  drawing = true;
  context.beginPath();
  context.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
});

// Send drawing data to server on mouse movement
canvas.addEventListener("mousemove", function (e) {
  if (drawing) {
    var drawData = {
      x: e.clientX - canvas.offsetLeft,
      y: e.clientY - canvas.offsetTop
    };
    // Send drawing data to server
    socket.emit("draw", drawData);

    // Draw locally on the client's canvas
    context.lineTo(drawData.x, drawData.y);
    context.stroke();
  }
});

// Stop drawing
canvas.addEventListener("mouseup", function () {
  drawing = false;
});

// Listen for draw events from the server
socket.on("draw", function (data) {
  // Update the canvas with drawing data from the server
  context.lineTo(data.x, data.y);
  context.stroke();
});
