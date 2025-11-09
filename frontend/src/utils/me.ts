import { apiEndpoint } from "../config";

// Utility to fetch the current logged-in user from backend
export async function fetchMe() {
   const res = await fetch(apiEndpoint("/api/me"), { credentials: "include" });
   if (!res.ok) throw new Error("Failed to fetch user info");
   const data = await res.json();
   return data.user;
}

// Update current user's profile
export async function updateProfile(updates: {
   name?: string;
   bio?: string;
   avatar?: string;
   handle?: string;
}) {
   const res = await fetch(apiEndpoint("/api/me"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates)
   });

   if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to update profile");
   }

   const data = await res.json();
   return data.user;
}
