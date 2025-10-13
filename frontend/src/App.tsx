// @ts-nocheck

import { useMemo, useState } from "react";
import type { Reel, Post, Tab } from "./types";
import HomeFeed from "./components/feed/HomeFeed";
import Messages from "./components/messages/Messages";
import Reels from "./components/reels/Reels";
import MediaGallery from "./components/media/MediaGallery";
import Profile from "./components/profile/Profile";
import { Header } from "./components/header";

export default function App() {
   const [tab, setTab] = useState<Tab>("home");
   const [profileUserId, setProfileUserId] = useState<string | null>(null);

   const [followMap, setFollowMap] = useState<{ [id: string]: Set<string> }>({});
   const followToggle = (uid: string) => {
      setFollowMap(prev => prev); // No-op until user data is available
   };

   const [posts, setPosts] = useState<Post[]>([]);
   const [reels, setReels] = useState<Reel[]>([]);

   const toggleReelLike = (id: string) => setReels(prev => prev.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
   const toggleReelSave = (id: string) => setReels(prev => prev.map(r => r.id === id ? { ...r, saved: !r.saved } : r));

   const openProfile = (uid: string) => { setProfileUserId(uid); setTab("profile"); };

   const mediaItems = useMemo(() => {
      const images = posts.filter(p => p.image).map(p => ({ kind: "image" as const, url: p.image!, id: p.id }));
      const videos = reels.map(r => ({ kind: "video" as const, url: r.src, id: r.id }));
      return [...images, ...videos];
   }, [posts, reels]);

   return (
      <div className="grid" style={{ gridTemplateColumns: "12rem auto" }}>
         <div className="h-[100vh] sticky top-0 p-2 w-full">
            <Header
               tab={tab}
               setTab={setTab}
               openProfile={openProfile}
            />
         </div>

         <div className="w-full m-h-[100vh] flex flex-col">
            <main className="mx-auto">
               {tab === "home" && (
                  <div>

                     <HomeFeed
                        meId={"replacementid"}
                        posts={posts}
                        setPosts={setPosts}
                        followMap={followMap}
                        followToggle={followToggle}
                        openProfile={openProfile}
                     />
                     <br></br>
                     <footer className="footer shell">Built with ❤️ in Freedom Land.</footer>

                  </div>
               )}
               {tab === "messages" && <Messages />}
               {tab === "reels" && <Reels reels={reels} setReels={setReels} toggleReelLike={toggleReelLike} toggleReelSave={toggleReelSave} />}
               {tab === "media" && <MediaGallery items={mediaItems} />}
               {tab === "profile" && profileUserId && (
                  <Profile
                     userId={profileUserId}
                     meId={"replacementid"}
                     posts={posts}
                     setPosts={setPosts}
                     followMap={followMap}
                     followToggle={followToggle}
                     reels={reels}
                     openProfile={openProfile}
                     onBack={() => { setTab("home"); setProfileUserId(null); }}
                  />
               )}
            </main>
         </div>
      </div>
   );
}
