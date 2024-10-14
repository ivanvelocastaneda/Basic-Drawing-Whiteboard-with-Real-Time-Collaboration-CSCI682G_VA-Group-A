// Initialize socket.io connection
var socket = io();

// Get canvas and set up context for drawing
var canvas = document.getElementById("drawing-canvas");
var ctx = canvas.getContext("2d");
var penButton = document.getElementById("pen-tool");
var eraserButton = document.getElementById("eraser-tool");
var dropdownToggle = document.getElementById("dropdown-toggle");
var dropdownMenu = document.getElementById("dropdown-menu");
var colorPicker = document.getElementById("color-picker");
var brushSize = document.getElementById("brush-size");
var undoButton = document.getElementById("undo");
var redoButton = document.getElementById("redo");
var clearButton = document.getElementById("clear");
var addLayerButton = document.getElementById("add-layer");
var newSketchButton = document.getElementById("new-sketch");
var saveSketchButton = document.getElementById("save-sketch");
var importImageButton = document.getElementById("import-image");
var shareButton = document.getElementById("share");
var settingsButton = document.getElementById("settings");
var supportButton = document.getElementById("support");

// Canvas setup
canvas.width = window.innerWidth - 250;
// Adjust for toolbar and layer panel
canvas.height = window.innerHeight - 50;

let drawing = false;
let currentTool = "pen";
let currentColor = colorPicker.value;
let currentBrushSize = brushSize.value;
let undoStack = [];
let redoStack = [];

// Event listeners
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
penButton.addEventListener("click", () => {
  currentTool = "pen";
  penButton.classList.add("active");
  eraserButton.classList.remove("active");
});
eraserButton.addEventListener("click", () => {
  currentTool = "eraser";
  eraserButton.classList.add("active");
  penButton.classList.remove("active");
});
dropdownToggle.addEventListener("click", () => {
  dropdownMenu.classList.toggle("show");
});
colorPicker.addEventListener("input", () => {
  currentColor = colorPicker.value;
});
brushSize.addEventListener("input", () => {
  currentBrushSize = brushSize.value;
});
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
clearButton.addEventListener("click", clearCanvas);

function startDrawing(e) {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
  saveState(); // Save state before new drawing
}

function draw(e) {
  if (!drawing) return;

  ctx.lineWidth = currentBrushSize;
  ctx.lineCap = "round";

  if (currentTool === "pen") {
    ctx.strokeStyle = currentColor;
    ctx.globalCompositeOperation = "source-over";
  } else if (currentTool === "eraser") {
    ctx.strokeStyle = "#ffffff";
    // White for erasing
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.lineTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
  ctx.stroke();
}

function stopDrawing() {
  drawing = false;
}

function saveState() {
  undoStack.push(canvas.toDataURL());
  redoStack = []; // Clear redo stack after new action
}

function undo() {
  if (undoStack.length > 0) {
    redoStack.push(undoStack.pop());
    restoreState(undoStack[undoStack.length - 1]);
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(redoStack.pop());
    restoreState(undoStack[undoStack.length - 1]);
  }
}

function restoreState(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const img = new Image();
  img.src = state;
  img.onload = () => ctx.drawImage(img, 0, 0);
}

// Clear canvas function
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  undoStack = [];
  redoStack = [];
}

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
    ctx.lineTo(drawData.x, drawData.y);
    ctx.stroke();
  }
});

// Stop drawing
canvas.addEventListener("mouseup", function () {
  drawing = false;
});

saveSketchButton.addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL();
  link.download = "whiteboard_sketch.png";
  link.click();
});

importImageButton.addEventListener("change", (event) => {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  reader.readAsDataURL(file);
});

shareButton.addEventListener("click", () => {
  const sessionId = Math.random().toString(36).substr(2, 9); // Unique ID generation
  const shareLink = `${window.location.origin}/whiteboard/${sessionId}`;

  // Display or copy the share link
  prompt("Share this link with others:", shareLink);

  // Optionally, send the session ID to the server to keep track of active sessions
  socket.emit("createSession", { sessionId });
});

// Listen for draw events from the server
socket.on("draw", function (data) {
  // Update the canvas with drawing data from the server
  ctx.lineTo(data.x, data.y);
  ctx.stroke();
});

// Dashboard js
const profileSection = document.getElementById("profile-section");
const profileDropdown = document.getElementById("profile-dropdown");
profileSection.addEventListener("click", () => {
  profileDropdown.classList.toggle("active");
});

document.addEventListener("click", (event) => {
  const isClickInside = profileSection.contains(event.target);

  if (!isClickInside) {
    profileDropdown.classList.remove("active");
  }
});

// Add event listener to the "Add Whiteboard" button
const newWhiteboardButton = document.getElementById("new-whiteboard");

newWhiteboardButton.addEventListener("click", () => {
  window.location.href = "index.html"; // Redirect to the whiteboard page
});
