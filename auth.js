const BudgetAuth = (() => {
  const USERS_KEY = "budgetTrackerUsersV1";
  const SESSION_KEY = "budgetTrackerAuthSessionV1";
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  const LEGACY_PASSWORD_KEYS = [
    "budgetTrackerSessionPassphrase",
    "budgetTrackerSessionAuthenticated",
    "budgetTrackerShortLivedAuth",
    "budgetTrackerLastActiveAt"
  ];

  function cleanupLegacyPasswordArtifacts() {
    LEGACY_PASSWORD_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  function normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
  }

  function encodeBase64(bytes) {
    let binary = "";
    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });
    return btoa(binary);
  }

  function decodeBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function getUsers() {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  async function hashPassword(password, saltBase64) {
    const salt = decodeBase64(saltBase64);
    const baseKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 150000,
        hash: "SHA-256"
      },
      baseKey,
      256
    );

    return encodeBase64(new Uint8Array(bits));
  }

  function validatePasswordPolicy(password) {
    const rules = {
      length: password.length >= 8 && password.length <= 32,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    return {
      valid: Object.values(rules).every(Boolean),
      rules
    };
  }

  async function createAccount(username, password) {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return { ok: false, message: "Username is required." };
    }

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return { ok: false, message: "Password does not meet requirements." };
    }

    const users = getUsers();
    const exists = users.some((user) => user.username === normalized);
    if (exists) {
      return { ok: false, message: "Username already exists." };
    }

    const salt = encodeBase64(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(password, salt);

    users.push({
      username: normalized,
      salt,
      passwordHash,
      createdAt: Date.now()
    });

    saveUsers(users);
    return { ok: true };
  }

  function saveSession(username) {
    const now = Date.now();
    const session = {
      username,
      createdAt: now,
      lastActiveAt: now
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      return parsed && parsed.username ? parsed : null;
    } catch {
      return null;
    }
  }

  function isSessionValid(session = getSession()) {
    if (!session) {
      return false;
    }

    return Date.now() - Number(session.lastActiveAt || 0) <= SESSION_TIMEOUT_MS;
  }

  function touchSession() {
    const session = getSession();
    if (!session || !isSessionValid(session)) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    session.lastActiveAt = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async function login(username, password) {
    const normalized = normalizeUsername(username);
    const users = getUsers();
    const user = users.find((entry) => entry.username === normalized);

    if (!user) {
      return { ok: false, message: "Invalid username or password." };
    }

    const attemptedHash = await hashPassword(password, user.salt);
    if (attemptedHash !== user.passwordHash) {
      return { ok: false, message: "Invalid username or password." };
    }

    saveSession(user.username);
    return { ok: true, username: user.username };
  }

  function logout({ loginPath = "login.html" } = {}) {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = loginPath;
  }

  function requireAuth({ loginPath = "login.html" } = {}) {
    const session = getSession();

    if (!isSessionValid(session)) {
      localStorage.removeItem(SESSION_KEY);
      if (!window.location.pathname.endsWith(loginPath)) {
        window.location.href = loginPath;
      }
      return null;
    }

    touchSession();
    return getSession();
  }

  function startActivityTracking() {
    const events = ["click", "keydown", "input", "pointerdown", "touchstart"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, touchSession, { passive: true });
    });

    window.setInterval(() => {
      if (!isSessionValid()) {
        localStorage.removeItem(SESSION_KEY);
        if (!window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("signup.html")) {
          window.location.href = "login.html";
        }
      }
    }, 15000);
  }

  cleanupLegacyPasswordArtifacts();

  return {
    createAccount,
    login,
    logout,
    requireAuth,
    startActivityTracking,
    validatePasswordPolicy,
    getSession,
    isSessionValid
  };
})();

window.BudgetAuth = BudgetAuth;
