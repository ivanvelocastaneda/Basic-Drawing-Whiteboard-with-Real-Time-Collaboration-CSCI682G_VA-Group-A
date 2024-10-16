const socket = io.connect("http://127.0.0.1:5000");

// Handle connection event
socket.on("connect", () => {
  console.log("Connected to server");
});

// Handle disconnection event
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

document.addEventListener("DOMContentLoaded", function () {
  // Get canvas and set up context for drawing
  var canvas = document.getElementById("drawing-canvas");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var penButton = document.getElementById("pen-tool");
    var eraserButton = document.getElementById("eraser-tool");
    var dropdownToggle = document.getElementById("dropdown-toggle");
    var dropdownMenu = document.getElementById("dropdown-menu");
    var colorPicker = document.getElementById("color-picker");
    var brushSize = document.getElementById("brush-size");
    var clearButton = document.getElementById("clear");
    var saveSketchButton = document.getElementById("save-sketch");
    var undoButton = document.getElementById("undo");
    var redoButton = document.getElementById("redo");
    var moveButton = document.getElementById("move-tool");

    // Canvas setup
    canvas.width = window.innerWidth - 250; // Adjust width based on toolbar and panel
    canvas.height =
      window.innerHeight -
      document.querySelector(".navbar").offsetHeight -
      document.querySelector(".bottom-bar").offsetHeight; // Adjust height based on navbar and bottom bar

    let drawing = false;
    let currentTool = "pen";
    let currentColor = colorPicker.value;
    let currentBrushSize = brushSize.value;
    let undoStack = [];
    let redoStack = [];
    let moving = false;
    let offsetX = 0;
    let offsetY = 0;

    // Event listeners
    canvas.addEventListener("mousedown", function (e) {
      if (currentTool === "move") {
        moving = true;
        offsetX = e.clientX;
        offsetY = e.clientY;
      } else {
        startDrawing(e);
      }
    });

    canvas.addEventListener("mousemove", function (e) {
      if (moving) {
        const dx = e.clientX - offsetX;
        const dy = e.clientY - offsetY;
        offsetX = e.clientX;
        offsetY = e.clientY;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
        ctx.putImageData(imageData, dx, dy); // Move the canvas content
      } else if (drawing) {
        draw(e);
      }
    });

    canvas.addEventListener("mouseup", function () {
      moving = false;
      stopDrawing();
    });

    penButton.addEventListener("click", () => {
      currentTool = "pen";
      activateTool(penButton);
    });

    eraserButton.addEventListener("click", () => {
      currentTool = "eraser";
      activateTool(eraserButton);
    });

    moveButton.addEventListener("click", () => {
      currentTool = "move";
      activateTool(moveButton);
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

    clearButton.addEventListener("click", clearCanvas);

    // Undo button functionality
    undoButton.addEventListener("click", undo);

    // Redo button functionality
    redoButton.addEventListener("click", redo);

    // Drawing functions
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

    function clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      undoStack = [];
      redoStack = [];
    }

    // Undo function
    function undo() {
      if (undoStack.length > 0) {
        redoStack.push(canvas.toDataURL()); // Save current state to redo stack
        let lastState = undoStack.pop(); // Get the last saved state
        let img = new Image();
        img.src = lastState;
        img.onload = function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
          ctx.drawImage(img, 0, 0); // Draw the previous state
        };
      }
    }

    // Redo function
    function redo() {
      if (redoStack.length > 0) {
        undoStack.push(canvas.toDataURL()); // Save current state to undo stack
        let lastRedoState = redoStack.pop();
        let img = new Image();
        img.src = lastRedoState;
        img.onload = function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
          ctx.drawImage(img, 0, 0); // Redraw the redo state
        };
      }
    }

    // Helper function to get mouse position relative to canvas
    function getCanvasX(e) {
      const rect = canvas.getBoundingClientRect();
      return (e.clientX - rect.left) * (canvas.width / rect.width);
    }

    function getCanvasY(e) {
      const rect = canvas.getBoundingClientRect();
      return (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    // Tool activation
    function activateTool(selectedTool) {
      const tools = [penButton, eraserButton, moveButton];
      tools.forEach((tool) => tool.classList.remove("active"));
      selectedTool.classList.add("active");
    }

    // Save whiteboard and send to server
    saveSketchButton.addEventListener("click", () => {
      const whiteboardName = prompt("Enter a name for your whiteboard:");
      if (whiteboardName) {
        const drawingData = canvas.toDataURL();
        const whiteboard = {
          name: whiteboardName,
          image: drawingData,
          timestamp: new Date().toISOString()
        };

        // Send whiteboard data to the server
        fetch("/api/whiteboards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(whiteboard)
        })
          .then((response) => {
            if (response.ok) {
              alert("Whiteboard saved successfully!");
              // Redirect to dashboard
              window.location.href = "/dashboard";
            } else {
              alert("Failed to save whiteboard.");
            }
          })
          .catch((error) => console.error("Error saving whiteboard:", error));
      }
    });

    // Fetch and display saved whiteboards on the dashboard
    fetch("/api/whiteboards")
      .then((response) => response.json())
      .then((whiteboards) => {
        const whiteboardsSection = document.getElementById(
          "saved-whiteboards-section"
        );
        whiteboardsSection.innerHTML = ""; // Clear previous content

        if (whiteboards.length > 0) {
          whiteboards.forEach((whiteboard, index) => {
            const whiteboardCard = document.createElement("div");
            whiteboardCard.classList.add("whiteboard-card");

            const title = document.createElement("h3");
            title.innerText = whiteboard.name || `Whiteboard ${index + 1}`;

            const img = document.createElement("img");
            img.src = whiteboard.image;
            img.alt = whiteboard.name;
            // Enforce consistent image size
            img.style.width = "250px";
            img.style.height = "250px";
            img.style.objectFit = "cover";

            // Display the timestamp
            const timestamp = document.createElement("p");
            timestamp.classList.add("timestamp");
            timestamp.innerText = `Last modified: ${whiteboard.timestamp}`;

            whiteboardCard.appendChild(title);
            whiteboardCard.appendChild(img);
            whiteboardCard.appendChild(timestamp);
            whiteboardsSection.appendChild(whiteboardCard);
          });
        } else {
          whiteboardsSection.innerHTML = "<p>No saved whiteboards found.</p>";
        }
      })
      .catch((error) => console.error("Error fetching whiteboards:", error));
  }
});
