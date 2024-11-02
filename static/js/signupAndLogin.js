function showForm(formType) {
  document.querySelectorAll(".form-container").forEach(function (form) {
    form.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach(function (tab) {
    tab.classList.remove("active");
  });

  document.getElementById(formType).classList.add("active");
  document
    .querySelector(".tab-btn[onclick=\"showForm('" + formType + "')\"]")
    .classList.add("active");
}

// // Example function to simulate user login status and information
// const isLoggedIn = true; // Change this based on your authentication logic
// const userInfo = {
//   name: "John Doe", // Replace with the actual user's name
//   email: "johndoe@example.com" // Replace with the actual user's email
// };

// Check login status and update the UI
if (isLoggedIn) {
  // Hide authentication options and show user profile
  document.getElementById("userProfile").style.display = "block";

  // Populate user information
  document.getElementById("userName").textContent = userInfo.name;
  document.getElementById("userNameDetail").textContent = userInfo.name;
  document.getElementById("userEmail").textContent = userInfo.email;
} else {
  // Show authentication options and hide user profile
  document.getElementById("userProfile").style.display = "none";
}

function signOut() {
  // Logic to sign out the user
  console.log("User signed out");
  // Perform sign-out actions, such as clearing session data
  // Redirect to login or home page after signing out
  window.location.href = "/login"; // Adjust the URL as needed
}
