const socket = io.connect("http://127.0.0.1:5000");
const csrfToken = document.getElementById('csrf_token').value;
let currentWhiteboardId; // Variable to store the current whiteboard ID
let canvas; // Declare the canvas variable globally
let ctx; // Declare the context variable globally

// Handle connection event
socket.on("connect", () => {
  console.log("Connected to server");
});

// Handle disconnection event
socket.on("disconnect", () => {
  console.log("Disconnected from server");
});

document.addEventListener("DOMContentLoaded", function () {
  canvas = document.getElementById("drawing-canvas"); // Initialize canvas here
  if (canvas) {
    ctx = canvas.getContext("2d"); // Initialize context here
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

    // Set canvas dimensions
    canvas.width = window.innerWidth - 250;
    canvas.height =
      window.innerHeight -
      document.querySelector(".navbar").offsetHeight -
      document.querySelector(".bottom-bar").offsetHeight;

    let drawing = false;
    let currentTool = "pen";
    let currentColor = colorPicker.value;
    let currentBrushSize = brushSize.value;
    let undoStack = [];
    let redoStack = [];
    let moving = false;
    let offsetX = 0;
    let offsetY = 0;
    let userId; // Variable to store the user ID

    // Get user ID from the server (assuming it's sent upon connection)
    socket.on("user_connected", (data) => {
      userId = data.user_id; // Store the user ID
    });

    // Event listeners for canvas
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(imageData, dx, dy);
      } else if (drawing) {
        draw(e);
      }
    });

    canvas.addEventListener("mouseup", function () {
      moving = false;
      stopDrawing();
    });

    // Tool button event listeners
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

    clearButton.addEventListener
    ("click", clearCanvas);
    undoButton.addEventListener("click", undo);
    redoButton.addEventListener("click", redo);

    // Drawing functions
    function startDrawing(e) {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(getCanvasX(e), getCanvasY(e));
      saveState();
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
        ctx.globalCompositeOperation = "destination-out";
      }

      ctx.lineTo(getCanvasX(e), getCanvasY(e));
      ctx.stroke();

      // Emit drawing data to the server
      socket.emit('draw', {
        user_id: userId, // Include user ID
        x: getCanvasX(e),
        y: getCanvasY(e),
        color: currentColor,
        brushSize: currentBrushSize,
        tool: currentTool
      });
    }

    function stopDrawing() {
      drawing = false;
    }

    // Listen for drawing events from the server
    socket.on('draw', (data) => {
      const { user_id, x, y, color, brushSize, tool } = data;

      // Only draw if the user_id matches the current user
      if (user_id !== userId) { // Check if the drawing event is not from the current user
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";

          if (tool === "pen") {
              ctx.strokeStyle = color;
              ctx.globalCompositeOperation = "source-over";
          } else if (tool === "eraser") {
              ctx.strokeStyle = "#ffffff";
              ctx.globalCompositeOperation = "destination-out";
          }

          ctx.lineTo(x, y);
          ctx.stroke();
      }
    });

    function saveState() {
      undoStack.push(canvas.toDataURL());
      redoStack = [];
    }

    function clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      undoStack = [];
      redoStack = [];
    }

    function undo() {
      if (undoStack.length > 0) {
        redoStack.push(canvas.toDataURL());
        let lastState = undoStack.pop();
        let img = new Image();
        img.src = lastState;
        img.onload = function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }

    function redo() {
      if (redoStack.length > 0) {
        undoStack.push(canvas.toDataURL());
        let lastRedoState = redoStack.pop();
        let img = new Image();
        img.src = lastRedoState;
        img.onload = function () {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }

    function getCanvasX(e) {
      const rect = canvas.getBoundingClientRect();
      return (e.clientX - rect.left) * (canvas.width / rect.width);
    }

    function getCanvasY(e) {
      const rect = canvas.getBoundingClientRect();
      return (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function activateTool(selectedTool) {
      const tools = [penButton, eraserButton, moveButton];
      tools.forEach((tool) => tool.classList.remove("active"));
      selectedTool.classList.add("active");
    }

    // Save whiteboard
    saveSketchButton.addEventListener("click", () => {
      const whiteboardName = prompt("Enter a name for your whiteboard:");
      if (whiteboardName) {
        const drawingData = canvas.toDataURL();
        const whiteboard = {
          name: whiteboardName,
          data: drawingData,
          image: drawingData,
          timestamp: new Date().toISOString()
        };

        fetch("/api/whiteboards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken // Use the CSRF token from the variable
          },
          body: JSON.stringify(whiteboard)
        })
          .then((response) => {
            if (response.ok) {
              alert("Whiteboard saved successfully!");
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

        if (whiteboardsSection) {
          whiteboardsSection.innerHTML = "";

          if (whiteboards.length > 0) {
            whiteboards.forEach((whiteboard) => {
              const whiteboardCard = document.createElement("div");
              whiteboardCard.classList.add("col-md-4", "mb-4");

              const card = document.createElement("div");
              card.classList.add("card");

              const img = document.createElement("img");
              img.src = whiteboard.image;
              img.alt = whiteboard.name;
              img.classList.add("card-img-top");

              const cardBody = document.createElement("div");
              cardBody.classList.add("card-body");

              const title = document.createElement("h5");
              title.classList.add("card-title");
              title.textContent = whiteboard.name;

              const deleteButton = document.createElement("button");
              deleteButton.textContent = "Delete";
              deleteButton.classList.add("btn", "btn-danger");
              deleteButton.onclick = () => deleteWhiteboard(whiteboard.id);

              cardBody.appendChild(title);
              cardBody.appendChild(deleteButton);
              card.appendChild(img);
              card.appendChild(cardBody);
              whiteboardCard.appendChild(card);
              whiteboardsSection.appendChild(whiteboardCard);
            });
          } else {
            whiteboardsSection.innerHTML =
              "<p>No saved whiteboards available.</p>";
          }
        }
      })
      .catch((error) => console.error("Error fetching whiteboards:", error));
  }
});

// Delete whiteboard
function deleteWhiteboard(id) {
  if (confirm("Are you sure you want to delete this whiteboard?")) {
    fetch(`/api/whiteboards/${id}`, {
      method: "DELETE", 
      headers: {
        "X-CSRFToken": csrfToken // Use the CSRF token from the variable
      },
    })
      .then((response) => {
        if (response.ok) {
          alert("Whiteboard deleted successfully!");
          location.reload();
          // Refresh the page to update the whiteboards list
        } else {
          alert("Failed to delete whiteboard.");
        }
      })
      .catch((error) => console.error("Error deleting whiteboard:", error));
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const urlParams = new URLSearchParams(window.location.search);
  const whiteboardId = urlParams.get('whiteboardId');

  if (whiteboardId) {
      loadWhiteboard(whiteboardId);
  }
});

function loadWhiteboard(whiteboardId) {
  fetch(`/api/whiteboards/${whiteboardId}`)
      .then(response => {
          if (!response.ok) {
              throw new Error('Failed to load whiteboard');
          }
          return response.json();
      })
      .then(data => {
          const img = new Image();
          img.src = data.image; // Assuming 'image' contains the data URL of the whiteboard
          img.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
              ctx.drawImage(img, 0, 0); // Draw the saved whiteboard
              // Show the Export PDF button since a saved whiteboard has been loaded
              document.getElementById("export-pdf").style.display = "block"; // Show the Export button
          };

          // Set the currentWhiteboardId to ensure it is available for updates
          currentWhiteboardId = whiteboardId; // Ensure the ID is set here
          console.log("Current Whiteboard ID set to:", currentWhiteboardId); // Log the current ID

          // Show the Update button since a saved whiteboard has been loaded
          document.getElementById("update-sketch").style.display = "block"; // Show the Update button
      })
      .catch(error => {
          console.error("Error loading whiteboard:", error);
          alert("Could not load the whiteboard. Please try again.");
      });
}

document.getElementById("update-sketch").addEventListener("click", () => {
  if (!currentWhiteboardId) {
      alert("No whiteboard loaded for updating.");
      return;
  }

  const drawingData = canvas.toDataURL();
  const whiteboard = {
      name: prompt("Enter a name for your whiteboard:"),
      data: drawingData,
      image: drawingData,
      timestamp: new Date().toISOString(),
  };

  fetch(`/api/whiteboards/${currentWhiteboardId}`, {
      method: "PUT",
      headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken // Use the CSRF token from the variable
      },
      body: JSON.stringify(whiteboard)
  })
  .then((response) => {
      if (response.ok) {
          alert("Whiteboard updated successfully!");
          window.location.href = "/dashboard"; // Redirect to dashboard
      } else {
          alert("Failed to update whiteboard.");
      }
  })
  .catch((error) => console.error("Error updating whiteboard:", error));
});


function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const canvasImage = canvas.toDataURL(" image/png");

  // Add the image to the PDF
  pdf.addImage(canvasImage, 'PNG', 10, 10, canvas.width / 10, canvas.height / 10); // Adjust the width and height as needed
  pdf.save('whiteboard.pdf');
}

// Add event listener for the Export PDF button
document.getElementById("export-pdf").addEventListener("click", exportToPDF);
