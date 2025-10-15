// @ts-nocheck

import { useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Reel, Post, Tab, User } from "./types";
import HomeFeed from "./components/feed/HomeFeed";
import Messages from "./components/messages/Messages";
import Reels from "./components/reels/Reels";
import MediaGallery from "./components/media/MediaGallery";
import Profile from "./components/profile/Profile";
import Podcasts from "./components/podcasts/Podcasts";
import { Header } from "./components/header";

interface AppProps {
   initialData: {
      githubClientId: string | null;
      user: User | null;
   };
}

export default function App({ initialData }: AppProps) {
   const location = useLocation();
   const navigate = useNavigate();

   const [profileUserId, setProfileUserId] = useState<string | null>(null);

   const [followMap, setFollowMap] = useState<{ [id: string]: Set<string> }>({});
   const followToggle = (uid: string) => {
      setFollowMap(prev => prev); // No-op until user data is available
   };

   const [posts, setPosts] = useState<Post[]>([]);
   const [reels, setReels] = useState<Reel[]>([]);

   const toggleReelLike = (id: string) => setReels(prev => prev.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
   const toggleReelSave = (id: string) => setReels(prev => prev.map(r => r.id === id ? { ...r, saved: !r.saved } : r));

   const openProfile = (uid: string) => {
      setProfileUserId(uid);
      navigate(`/profile/${uid}`);
   };

   const mediaItems = useMemo(() => {
      const images = posts.filter(p => p.image).map(p => ({ kind: "image" as const, url: p.image!, id: p.id }));
      const videos = reels.map(r => ({ kind: "video" as const, url: r.src, id: r.id }));
      return [...images, ...videos];
   }, [posts, reels]);

   // Check if current route is reels (needs full viewport)
   const isReelsPage = location.pathname === '/reels';

   return (
      <div className="min-h-screen bg-bg dark:bg-bg-dark md:grid md:grid-cols-[12rem_auto]">
         <div className="hidden md:block h-[100vh] sticky top-0 p-2 w-full">
            <Header
               openProfile={openProfile}
               githubClientId={initialData.githubClientId}
               user={initialData.user}
            />
         </div>

         {/* Mobile bottom nav (rendered in Header component) */}
         <div className="md:hidden">
            <Header
               openProfile={openProfile}
               githubClientId={initialData.githubClientId}
               user={initialData.user}
            />
         </div>

         <div className={`w-full flex flex-col ${isReelsPage ? 'h-screen overflow-hidden' : 'min-h-screen pb-20 md:pb-0'}`}>
            <main className={`mx-auto w-full ${isReelsPage ? 'h-full p-0' : 'max-w-full px-0 md:px-4'}`}>
               <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={
                     <div>
                        <HomeFeed
                           meId={initialData.user?.id || ""}
                           posts={posts}
                           setPosts={setPosts}
                           followMap={followMap}
                           followToggle={followToggle}
                           openProfile={openProfile}
                           user={initialData.user}
                        />
                        <br></br>
                        <footer className="pt-7 pb-10 text-center text-sub dark:text-sub-dark text-xs">Built with ❤️ in Freedom Land.</footer>
                     </div>
                  } />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/reels" element={
                     <Reels
                        reels={reels}
                        setReels={setReels}
                        toggleReelLike={toggleReelLike}
                        toggleReelSave={toggleReelSave}
                     />
                  } />
                  <Route path="/media" element={<MediaGallery items={mediaItems} />} />
                  <Route path="/podcasts" element={<Podcasts />} />
                  <Route path="/profile/:userId" element={
                     <Profile
                        userId={initialData.user?.id || profileUserId || ""}
                        meId={initialData.user?.id || ""}
                        posts={posts}
                        setPosts={setPosts}
                        followMap={followMap}
                        followToggle={followToggle}
                        reels={reels}
                        openProfile={openProfile}
                        onBack={() => { navigate("/home"); setProfileUserId(null); }}
                     />
                  } />
               </Routes>
            </main>
         </div>
      </div>
   );
}
