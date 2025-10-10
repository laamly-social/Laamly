// src/utils/github.ts
export async function fetchGithubClientId(): Promise<string | null> {
  const res = await fetch("/api/github-client-id", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.clientId ?? null;
}
