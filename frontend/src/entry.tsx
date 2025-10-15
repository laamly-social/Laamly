import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import LoggedOutPage from "./LoggedOutPage";
import type { User } from "./types";

const path = window.location.pathname;

// Extract initial data from URL params (passed from backend)
function getInitialDataFromURL(): { githubClientId: string | null; user: User | null } | null {
  const urlParams = new URLSearchParams(window.location.search);
  const dataParam = urlParams.get('data');

  if (dataParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(dataParam));
      return {
        githubClientId: parsed.githubClientId || null,
        user: parsed.user || null
      };
    } catch (e) {
      console.error("Failed to parse initial data:", e);
    }
  }

  return null;
}

// Fetch initial data from API if not in URL
async function fetchInitialData(): Promise<{ githubClientId: string | null; user: User | null }> {
  try {
    const response = await fetch("http://localhost:8080/api/initial-data", {
      credentials: "include"
    });
    const data = await response.json();
    return {
      githubClientId: data.githubClientId || null,
      user: data.user || null
    };
  } catch (e) {
    console.error("Failed to fetch initial data:", e);
    return { githubClientId: null, user: null };
  }
}

function AppWrapper() {
  const [initialData, setInitialData] = useState<{ githubClientId: string | null; user: User | null } | null>(
    getInitialDataFromURL()
  );
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData) {
      fetchInitialData().then(data => {
        setInitialData(data);
        setLoading(false);
      });
    }
  }, [initialData]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return <App initialData={initialData!} />;
}

const showLoggedOut = path === "/logged-out";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {showLoggedOut ? <LoggedOutPage /> : <AppWrapper />}
    </BrowserRouter>
  </React.StrictMode>
);
