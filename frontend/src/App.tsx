// src/App.tsx
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
   Routes,
   Route,
   Navigate,
   useLocation,
   useNavigate
} from "react-router-dom";
import type { Reel, Post, User } from "./types";
import HomeFeed from "./components/feed/HomeFeed";
import Messages from "./components/messages/Messages";
import MessageThreadPage from "./components/messages/MessageThreadPage";
import Reels from "./components/reels/Reels";
import SinglePost from "./components/feed/SinglePost";
import SingleReel from "./components/reels/SingleReel";
import Profile from "./components/profile/Profile";
import Podcasts from "./components/podcasts/Podcasts";
import NotificationsPage from "./components/notifications/NotificationsPage";
import FeedbackPage from "./components/feedback/FeedbackPage";
import FeedbackListPage from "./components/feedback/FeedbackListPage";
import { NotificationPrompt } from "./components/notifications/NotificationPrompt";
import { Header } from "./components/header";
import { useAuthCheck } from "./hooks/useAuthCheck";
import { useNotificationPermission } from "./hooks/useNotificationPermission";
import { BACKEND_URL } from "./config";
import {
   togglePostLike,
   deletePost as deletePostApi,
   editPost as editPostApi,
   fetchAllPosts
} from "./utils/posts";
import { createComment } from "./utils/comments";
import { fetchAllReels } from "./utils/reels";

type InitialData = {
   githubClientId: string | null;
   googleClientId: string | null;
   user: User | null;
};

interface AppProps {
   initialData?: {
      githubClientId?: string | null;
      googleClientId?: string | null;
      user?: User | null;
   };
}

export default function App({ initialData }: AppProps) {
   const location = useLocation();
   const navigate = useNavigate();

   const [data, setData] = useState<InitialData>({
      githubClientId: initialData?.githubClientId ?? null,
      googleClientId: initialData?.googleClientId ?? null,
      user: initialData?.user ?? null
   });

   useEffect(() => {
      let cancelled = false;
      (async () => {
         try {
            const res = await fetch(`${BACKEND_URL}/api/initial-data`, {
               credentials: "include"
            });
            const j = await res.json();
            if (cancelled) return;
            setData({
               githubClientId: j.githubClientId || null,
               googleClientId: j.googleClientId || null,
               user: j.user || null
            });
         } catch {}
      })();
      return () => {
         cancelled = true;
      };
   }, []);

   useAuthCheck(data.user?.id, 15000);

   // Notification permission hook
   const { shouldShowPrompt, hidePrompt, permission } =
      useNotificationPermission();

   const [profileUserId, setProfileUserId] = useState<string | null>(null);
   const [followMap, setFollowMap] = useState<{ [id: string]: Set<string> }>(
      {}
   );
   const followToggle = (uid: string) =>
      setFollowMap((prev) => {
         const me = data.user?.id;
         if (!me) return prev;
         const next = { ...prev };
         const current = new Set(next[uid] ? Array.from(next[uid]) : []);
         current.has(me) ? current.delete(me) : current.add(me);
         next[uid] = current;
         return next;
      });

   const [posts, setPosts] = useState<Post[]>([]);
   const [reels, setReels] = useState<Reel[]>([]);

   // Fetch posts and reels on mount
   useEffect(() => {
      (async () => {
         const [fetchedPosts, fetchedReels] = await Promise.all([
            fetchAllPosts(),
            fetchAllReels()
         ]);
         setPosts(fetchedPosts);
         setReels(fetchedReels);
      })();
   }, []);

   const openProfile = (uid: string) => {
      setProfileUserId(uid);
      navigate(`/profile/${uid}`);
   };

   // Helper functions for post actions
   const handleAddComment = async (postId: string, text: string) => {
      try {
         await createComment(postId, text);
      } catch (error) {
         console.error("Failed to add comment:", error);
      }
   };

   const handleDeletePost = async (id: string) => {
      try {
         await deletePostApi(id);
         setPosts((prev) => prev.filter((p) => p._id !== id && p.id !== id));
      } catch (error) {
         console.error("Failed to delete post:", error);
      }
   };

   const handleEditPost = async (id: string, content: string) => {
      try {
         await editPostApi(id, content);
         setPosts((prev) =>
            prev.map((p) => (p._id === id ? { ...p, content } : p))
         );
      } catch (error) {
         console.error("Failed to edit post:", error);
      }
   };

   const handleToggleLike = async (postId: string) => {
      try {
         const { liked, likes } = await togglePostLike(postId);
         setPosts((prev) =>
            prev.map((p) => (p._id === postId ? { ...p, liked, likes } : p))
         );
      } catch (error) {
         console.error("Failed to toggle like:", error);
      }
   };

   const handleToggleRepost = (originalId: string) => {
      // Implement repost logic if needed
      console.log("Repost:", originalId);
   };

   const isReelsPage =
      location.pathname === "/reels" || location.pathname.startsWith("/reel/");

   return (
      <div className="min-h-screen bg-bg dark:bg-bg-dark md:grid md:grid-cols-[12rem_auto]">
         {/* Notification prompt - only show to logged-in users */}
         {data.user && shouldShowPrompt && (
            <NotificationPrompt
               onClose={hidePrompt}
               onEnable={() => {
                  console.log("Notifications enabled successfully");
               }}
            />
         )}

         {/* Desktop sidebar - always visible */}
         <div className="hidden md:block h-[100vh] sticky top-0 p-2 w-full z-1">
            <Header
               openProfile={openProfile}
               githubClientId={data.githubClientId}
               googleClientId={data.googleClientId}
               user={data.user}
            />
         </div>

         {/* Hide header on mobile only when on reels page */}
         {!isReelsPage && (
            <div className="md:hidden">
               <Header
                  openProfile={openProfile}
                  githubClientId={data.githubClientId}
                  googleClientId={data.googleClientId}
                  user={data.user}
               />
            </div>
         )}

         <div
            className={`w-full flex flex-col relative z-0 ${isReelsPage ? "h-screen overflow-hidden" : "min-h-screen pb-20 md:pb-0"}`}>
            <main
               className={`mx-auto w-full ${isReelsPage ? "h-full p-0" : "max-w-full px-0"}`}>
               <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route
                     path="/home"
                     element={
                        <div>
                           <HomeFeed
                              meId={data.user?.id || ""}
                              posts={posts}
                              setPosts={setPosts}
                              followMap={followMap}
                              followToggle={followToggle}
                              openProfile={openProfile}
                              user={data.user}
                           />
                           <br />
                           <footer className="pt-7 pb-10 text-center text-sub dark:text-sub-dark text-xs">
                              Built with ❤️ in Freedom Land.
                           </footer>
                        </div>
                     }
                  />
                  <Route path="/messages" element={<Messages />} />
                  <Route
                     path="/messages/:threadId"
                     element={
                        window.innerWidth < 768 ? (
                           <MessageThreadPage />
                        ) : (
                           <Messages />
                        )
                     }
                  />

                  {/* Individual post route */}
                  <Route
                     path="/post/:id"
                     element={
                        <SinglePost
                           meId={data.user?.id || ""}
                           openProfile={openProfile}
                           addComment={handleAddComment}
                           deletePost={handleDeletePost}
                           editPost={handleEditPost}
                           user={data.user}
                           toggleLike={handleToggleLike}
                           toggleRepost={handleToggleRepost}
                        />
                     }
                  />

                  {/* ✅ FIX: do NOT pass toggleReelLike/toggleReelSave */}
                  <Route
                     path="/reels"
                     element={
                        <Reels
                           reels={reels}
                           setReels={setReels}
                           user={data.user}
                        />
                     }
                  />

                  {/* Individual reel route */}
                  <Route
                     path="/reel/:id"
                     element={<SingleReel user={data.user} />}
                  />

                  <Route path="/podcasts" element={<Podcasts />} />
                  <Route
                     path="/notifications"
                     element={<NotificationsPage />}
                  />
                  <Route path="/feedback" element={<FeedbackPage />} />
                  <Route path="/feedback/view" element={<FeedbackListPage />} />
                  <Route
                     path="/profile/:userId"
                     element={
                        <Profile
                           userId={data.user?.id || profileUserId || ""}
                           meId={data.user?.id || ""}
                           posts={posts}
                           setPosts={setPosts}
                           followMap={followMap}
                           followToggle={followToggle}
                           reels={reels}
                           openProfile={openProfile}
                           onBack={() => {
                              navigate("/home");
                              setProfileUserId(null);
                           }}
                           deletePost={handleDeletePost}
                           editPost={handleEditPost}
                           toggleLike={handleToggleLike}
                           addComment={handleAddComment}
                        />
                     }
                  />
               </Routes>
            </main>
         </div>
      </div>
   );
}
