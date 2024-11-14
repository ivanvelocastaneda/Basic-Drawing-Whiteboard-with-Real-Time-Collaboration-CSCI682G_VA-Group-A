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

function signOut() {
  // Logic to sign out the user
  console.log("User signed out");
  // Perform sign-out actions, such as clearing session data
  // Redirect to login or home page after signing out
  window.location.href = "/login"; // Adjust the URL as needed
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
}
