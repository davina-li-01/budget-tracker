const signupForm = document.querySelector("#signup-form");
const usernameInput = document.querySelector("#signup-username");
const passwordInput = document.querySelector("#signup-password");
const confirmInput = document.querySelector("#signup-password-confirm");
const errorEl = document.querySelector("#signup-error");
const successEl = document.querySelector("#signup-success");

function showError(message) {
  successEl.textContent = "";
  successEl.classList.add("hidden");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function showSuccess(message) {
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
  successEl.textContent = message;
  successEl.classList.remove("hidden");
}

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmation = confirmInput.value;

  if (!username) {
    showError("Username is required.");
    return;
  }

  if (password !== confirmation) {
    showError("Passwords do not match.");
    return;
  }

  const policy = window.BudgetAuth.validatePasswordPolicy(password);
  if (!policy.valid) {
    showError("Password must be 8-32 chars with uppercase, lowercase, and special character.");
    return;
  }

  const result = await window.BudgetAuth.createAccount(username, password);
  if (!result.ok) {
    showError(result.message);
    return;
  }

  showSuccess("Account created. Redirecting to login...");
  window.setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
});
