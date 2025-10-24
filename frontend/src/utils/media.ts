import { apiEndpoint } from "../config";

// Utility to fetch media for the logged-in user
export async function fetchUserMedia() {
  const res = await fetch(apiEndpoint("/posts/getMedia"), { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch media");
  const data = await res.json();
  return data.media || [];
}
