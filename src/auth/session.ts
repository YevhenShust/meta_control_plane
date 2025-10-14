// Session management module - handles token and username storage

const STORAGE_KEY_TOKEN = 'auth_token';
const STORAGE_KEY_USERNAME = 'auth_username';

// In-memory state for fast access
let cachedToken: string | null = null;
let cachedUsername: string | null = null;

// Listeners for session changes
type SessionListener = () => void;
const listeners: SessionListener[] = [];

// Load from localStorage on first access
function ensureLoaded(): void {
  if (cachedToken === null) {
    try {
      cachedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      cachedUsername = localStorage.getItem(STORAGE_KEY_USERNAME);
    } catch {
      // localStorage unavailable (private mode) - stay in-memory only
    }
  }
}

export function getToken(): string | null {
  ensureLoaded();
  return cachedToken;
}

export function getUsername(): string | null {
  ensureLoaded();
  return cachedUsername;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return Boolean(token && token.trim().length > 0);
}

export function setSession(token: string, username: string): void {
  cachedToken = token;
  cachedUsername = username;
  
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_USERNAME, username);
  } catch {
    // localStorage unavailable - continue with in-memory only
  }
  
  notifyListeners();
}

export function clearSession(): void {
  cachedToken = null;
  cachedUsername = null;
  
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USERNAME);
  } catch {
    // localStorage unavailable - ignore
  }
  
  notifyListeners();
}

export function onSessionChange(listener: SessionListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyListeners(): void {
  for (const listener of listeners.slice()) {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  }
}
