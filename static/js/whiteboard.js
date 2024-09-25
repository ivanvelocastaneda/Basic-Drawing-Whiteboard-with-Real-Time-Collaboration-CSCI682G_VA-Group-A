var canvas = document.getElementById("whiteboard");
var context = canvas.getContext("2d");
var drawing = false;

var socket = io();

// Start drawing
canvas.addEventListener("mousedown", function (e) {
  drawing = true;
  context.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
});

// Draw and emit draw events
canvas.addEventListener("mousemove", function (e) {
  if (drawing) {
    var data = {
      x: e.clientX - canvas.offsetLeft,
      y: e.clientY - canvas.offsetTop
    };
    socket.emit("draw", data);
    context.lineTo(data.x, data.y);
    context.stroke();
  }
});

// Stop drawing
canvas.addEventListener("mouseup", function () {
  drawing = false;
});

// Handle incoming drawing events from other users
socket.on("draw", function (data) {
  context.lineTo(data.x, data.y);
  context.stroke();
});

// Stop drawing if mouse leaves canvas
canvas.addEventListener("mouseleave", function () {
  drawing = false;
});
