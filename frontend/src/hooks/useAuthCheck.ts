import { useEffect, useRef } from "react";
import { apiEndpoint } from "../config";

/**
 * Hook to periodically check if the user is still authenticated
 * If the user was logged in but is now logged out, reload the page
 *
 * @param userId - The current user's ID (null if not logged in)
 * @param intervalMs - How often to check (default: 60 seconds)
 */
export function useAuthCheck(
   userId: string | null | undefined,
   intervalMs: number = 15000
) {
   const wasLoggedInRef = useRef(!!userId);

   useEffect(() => {
      // Update the ref when userId changes
      wasLoggedInRef.current = !!userId;
   }, [userId]);

   useEffect(() => {
      // Only run the check if user is currently logged in
      if (!userId) {
         return;
      }

      const checkAuth = async () => {
         try {
            const response = await fetch(apiEndpoint("/api/me"), {
               credentials: "include"
            });

            if (!response.ok) {
               location.reload();
            }

            const data = await response.json();

            // If we were logged in but now we're not, reload the page
            if (wasLoggedInRef.current && !data.id) {
               console.warn("User session expired, reloading page...");
               window.location.reload();
            }
         } catch (error) {
            console.error("Error checking auth status:", error);
            location.reload();
         }
      };

      // Set up interval to check auth periodically
      const intervalId = setInterval(checkAuth, intervalMs);

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
   }, [userId, intervalMs]);
}
