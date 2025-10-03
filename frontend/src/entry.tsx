import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoggedOutPage from "./LoggedOutPage";

const path = window.location.pathname;

// Helper to check login status (sync, fallback to logged out)
function isLoggedIn() {
  // Try to read from localStorage or a global if you set it after login
  // For now, always fallback to logged out for /logged-out and /my-posts
  return false;
}

const showLoggedOut = path === "/logged-out" || (path === "/my-posts" && !isLoggedIn());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {showLoggedOut ? <LoggedOutPage /> : <App />}
  </React.StrictMode>
);
