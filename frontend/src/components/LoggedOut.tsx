import React from "react";
import { BACKEND_URL } from "../config";

export default function LoggedOut() {
   const [githubClientId, setGithubClientId] = React.useState<string | null>(
      null
   );
   const [googleClientId, setGoogleClientId] = React.useState<string | null>(
      null
   );

   React.useEffect(() => {
      // Fetch both client IDs from the backend
      fetch(`${BACKEND_URL}/api/initial-data`, { credentials: "include" })
         .then((res) => res.json())
         .then((data) => {
            setGithubClientId(data.githubClientId || null);
            setGoogleClientId(data.googleClientId || null);
         })
         .catch((err) => {
            console.error("Failed to fetch client IDs:", err);
            setGithubClientId(null);
            setGoogleClientId(null);
         });
   }, []);

   const githubRedirectUri = encodeURIComponent(`${BACKEND_URL}/auth/github`);
   const githubAuthUrl = githubClientId
      ? `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${githubRedirectUri}`
      : undefined;

   const googleRedirectUri = encodeURIComponent(`${BACKEND_URL}/auth/google`);
   const googleAuthUrl = googleClientId
      ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${googleRedirectUri}&response_type=code&scope=openid%20email%20profile`
      : undefined;

   return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg dark:bg-bg-dark text-text dark:text-text-dark">
         <h1 className="text-3xl font-bold mb-4">You are logged out</h1>
         <p className="mb-8">Please sign in to continue.</p>

         {/* GitHub Login */}
         {githubAuthUrl ? (
            <a
               href={githubAuthUrl}
               className="transition-all py-4 px-4 my-2 w-full max-w-xs text-center border bg-close-light dark:bg-close-dark hover:bg-close-h-light hover:dark:bg-close-h-dark border-close-b-light dark:border-close-b-dark rounded-md">
               <span className="fa fa-github"></span> Sign in with GitHub
            </a>
         ) : (
            <span className="opacity-50 py-4 px-4 my-2 w-full max-w-xs text-center border rounded-md">
               Loading GitHub login…
            </span>
         )}

         {/* Google Login */}
         {googleAuthUrl ? (
            <a
               href={googleAuthUrl}
               className="transition-all py-4 px-4 my-2 w-full max-w-xs text-center border bg-red-500 hover:bg-red-600 text-white rounded-md">
               <span className="fa fa-google"></span> Sign in with Google
            </a>
         ) : (
            <span className="opacity-50 py-4 px-4 my-2 w-full max-w-xs text-center border rounded-md">
               Loading Google login…
            </span>
         )}
      </div>
   );
}
