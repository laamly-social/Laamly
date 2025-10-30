import React from "react";
import { fetchGithubClientId } from "../utils/github";
import { BACKEND_URL } from "../config";

export default function LoggedOut() {
  const [githubClientId, setGithubClientId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchGithubClientId().then(setGithubClientId).catch(() => setGithubClientId(null));
  }, []);

  const redirectUri = encodeURIComponent(`${BACKEND_URL}/auth/github`);
  const githubAuthUrl = githubClientId
    ? `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}`
    : undefined;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg dark:bg-bg-dark text-text dark:text-text-dark">
      <h1 className="text-3xl font-bold mb-4">You are logged out</h1>
      <p className="mb-8">Please sign in to continue.</p>
      {githubAuthUrl ? (
        <a
          href={githubAuthUrl}
          className="transition-all py-4 px-4 my-2 w-full max-w-xs text-center border bg-close-light dark:bg-close-dark hover:bg-close-h-light hover:dark:bg-close-h-dark border-close-b-light dark:border-close-b-dark rounded-md"
        >
          <span className="fa fa-github"></span> Sign in with GitHub
        </a>
      ) : (
        <span className="opacity-50 py-4 px-4 my-2 w-full border rounded-md">Loading GitHub login…</span>
      )}
    </div>
  );
}
