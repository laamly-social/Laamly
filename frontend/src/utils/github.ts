// Utility to fetch GitHub client ID from backend
export async function fetchGithubClientId() {
  const res = await fetch('/api/github-client-id');
  if (!res.ok) throw new Error('Failed to fetch GitHub client ID');
  const data = await res.json();
  return data.clientId;
}
