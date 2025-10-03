// Utility to fetch the current logged-in user from backend
export async function fetchMe() {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch user info');
  const data = await res.json();
  return data.user;
}
