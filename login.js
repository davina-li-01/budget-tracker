const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#login-username");
const passwordInput = document.querySelector("#login-password");
const errorEl = document.querySelector("#login-error");

if (window.BudgetAuth?.isSessionValid(window.BudgetAuth.getSession())) {
  window.location.href = "index.html";
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError("Username and password are required.");
    return;
  }

  const result = await window.BudgetAuth.login(username, password);
  if (!result.ok) {
    showError(result.message);
    return;
  }

  window.location.href = "index.html";
});
