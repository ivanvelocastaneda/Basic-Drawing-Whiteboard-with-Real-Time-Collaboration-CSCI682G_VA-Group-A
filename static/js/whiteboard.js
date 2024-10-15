// Initialize socket.io connection
var socket = io();

// Get canvas and set up context for drawing
var canvas = document.getElementById("drawing-canvas");
var ctx = canvas.getContext("2d");
var penButton = document.getElementById("pen-tool");
var eraserButton = document.getElementById("eraser-tool");
var handButton = document.getElementById("move");
var dropdownToggle = document.getElementById("dropdown-toggle");
var dropdownMenu = document.getElementById("dropdown-menu");
var colorPicker = document.getElementById("color-picker");
var brushSize = document.getElementById("brush-size");
var undoButton = document.getElementById("undo");
var redoButton = document.getElementById("redo");
var clearButton = document.getElementById("clear");
var newSketchButton = document.getElementById("new-sketch");
var saveSketchButton = document.getElementById("save-sketch");
var importImageButton = document.getElementById("import-image");
var shareButton = document.getElementById("share");
var settingsButton = document.getElementById("settings");
var supportButton = document.getElementById("support");

// Canvas setup
canvas.width = window.innerWidth - 250; // Adjust width based on toolbar and panel
canvas.height = window.innerHeight - 50; // Adjust height based on top bar

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
  dropdownMenu.style.display =
    dropdownMenu.style.display === "block" ? "none" : "block";
});
window.addEventListener("click", (event) => {
  if (!event.target.matches("#dropdown-toggle")) {
    dropdownMenu.style.display = "none";
  }
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
  ctx.moveTo(getCanvasX(e), getCanvasY(e)); // Use helper function for accurate positioning
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
    ctx.strokeStyle = "#ffffff"; // White for erasing
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.lineTo(getCanvasX(e), getCanvasY(e)); // Use helper function for accurate positioning
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

// Helper function to get mouse position relative to canvas
function getCanvasX(e) {
  const rect = canvas.getBoundingClientRect();
  // Adjust using the bounding rectangle and window.devicePixelRatio for high-DPI displays
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  console.log("Canvas X: ", x); // Debugging log
  return x;
}

function getCanvasY(e) {
  const rect = canvas.getBoundingClientRect();
  // Adjust using the bounding rectangle and window.devicePixelRatio for high-DPI displays
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  console.log("Canvas Y: ", y); // Debugging log
  return y;
}

// Send drawing data to server on mouse movement
canvas.addEventListener("mousemove", function (e) {
  if (drawing) {
    var drawData = {
      x: getCanvasX(e),
      y: getCanvasY(e)
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

let isPanning = false;
let startX = 0,
  startY = 0;
let offsetX = 0,
  offsetY = 0;
let savedOffsetX = 0,
  savedOffsetY = 0;
let savedCanvas = null; // Variable to store canvas image

// Switch to hand tool
handButton.addEventListener("click", () => {
  currentTool = "hand";
  handButton.classList.add("active");
  penButton.classList.remove("active");
  eraserButton.classList.remove("active");
});

// Start panning when the hand tool is active
canvas.addEventListener("mousedown", (e) => {
  if (currentTool === "hand") {
    isPanning = true;
    startX = e.clientX;
    startY = e.clientY;
    savedCanvas = new Image(); // Store the current canvas
    savedCanvas.src = canvas.toDataURL();
    canvas.style.cursor = "grabbing"; // Change cursor to grabbing hand
  } else if (currentTool === "pen" || currentTool === "eraser") {
    startDrawing(e); // Start drawing if not in "hand" mode
  }
});

// Move the canvas content when the hand tool is active
canvas.addEventListener("mousemove", (e) => {
  if (isPanning && currentTool === "hand") {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    offsetX = savedOffsetX + dx;
    offsetY = savedOffsetY + dy;

    // Clear the canvas and apply the pan offset to the whole drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY); // Move the entire canvas content

    // Redraw the saved canvas image at the new offset
    if (savedCanvas) {
      ctx.drawImage(savedCanvas, 0, 0);
    }

    ctx.restore();
  } else if (drawing && (currentTool === "pen" || currentTool === "eraser")) {
    draw(e); // Handle drawing as usual
  }
});

// Stop panning and save the last offset position
canvas.addEventListener("mouseup", () => {
  if (isPanning) {
    isPanning = false;
    savedOffsetX = offsetX;
    savedOffsetY = offsetY;
    canvas.style.cursor = "default"; // Reset cursor to default
  } else {
    stopDrawing(); // Stop drawing when mouse is released
  }
});

// Stop panning if the mouse leaves the canvas
canvas.addEventListener("mouseleave", () => {
  if (isPanning) {
    isPanning = false;
    savedOffsetX = offsetX;
    savedOffsetY = offsetY;
    canvas.style.cursor = "default";
  }
});

// Drawing should be disabled when the hand tool is active
function startDrawing(e) {
  if (currentTool !== "hand") {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(getCanvasX(e), getCanvasY(e)); // Accurate positioning
    saveState(); // Save the state before new drawing
  }
}

// Dashboard js

// Toggle Profile Dropdown
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
