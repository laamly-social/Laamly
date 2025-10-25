// API_URL is the full URL to the backend (used for OAuth redirects, etc.)
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.laamly.com';

// In development with Vite proxy, use relative paths for API calls
// In production, use full URL
const isDev = import.meta.env.DEV;

// Helper function to build API endpoints
// This returns relative paths in dev (for Vite proxy) and full URLs in production
export const apiEndpoint = (path: string) => {
  // In dev mode, return relative path so Vite proxy can handle it
  if (isDev) {
    return path;
  }
  // In production, return full URL
  const fullUrl = `${API_URL}${path}`;
  return fullUrl;
};
