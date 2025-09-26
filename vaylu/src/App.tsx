import { useMemo, useState } from "react";
import "./App.css";
import { PlayCircle, Image as ImageIcon, Home, MessageSquare, PlayCircle as PlayTab } from "lucide-react";
import { USERS, SEED_POSTS } from "./data/mock";
import type { Reel, Post, Tab } from "./types";
import TabBtn from "./components/nav/TabBtn";
import HomeFeed from "./components/feed/HomeFeed";
import Messages from "./components/messages/Messages";
import Reels from "./components/reels/Reels";
import MediaGallery from "./components/media/MediaGallery";
import Profile from "./components/profile/Profile";

export default function App() {
  const me = USERS[0];
  const [tab, setTab] = useState<Tab>("home");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const [followMap, setFollowMap] = useState<{ [id: string]: Set<string> }>(() => {
    const map: { [id: string]: Set<string> } = {};
    USERS.forEach(u => { map[u.id] = new Set(); });
    return map;
  });
  const followToggle = (uid: string) => {
    setFollowMap(prev => {
      const newSet = new Set(prev[me.id]);
      if (newSet.has(uid)) newSet.delete(uid); else newSet.add(uid);
      return { ...prev, [me.id]: newSet };
    });
  };

  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [reels, setReels] = useState<Reel[]>([
    { id: "r1", title: "Sunset ride", authorId: "u2", src: "https://cdn.coverr.co/videos/coverr-a-car-driving-on-the-roads-1642/1080p.mp4", liked: false, saved: false },
    { id: "r2", title: "Coffee drip ASMR", authorId: "u3", src: "https://cdn.coverr.co/videos/coverr-coffee-drip-8054/1080p.mp4", liked: false, saved: false },
    { id: "r3", title: "Coding vibes", authorId: "u4", src: "https://cdn.coverr.co/videos/coverr-a-man-typing-on-his-laptop-6963/1080p.mp4", liked: false, saved: false },
  ]);

  const toggleReelLike = (id: string) => setReels(prev => prev.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
  const toggleReelSave = (id: string) => setReels(prev => prev.map(r => r.id === id ? { ...r, saved: !r.saved } : r));

  const openProfile = (uid: string) => { setProfileUserId(uid); setTab("profile"); };

  const mediaItems = useMemo(() => {
    const images = posts.filter(p => p.image).map(p => ({ kind: "image" as const, url: p.image!, id: p.id }));
    const videos = reels.map(r => ({ kind: "video" as const, url: r.src, id: r.id }));
    return [...images, ...videos];
  }, [posts, reels]);

  return (
    <div className="app">
      <header className="nav">
        <div className="nav__row shell">
          <div className="brand"><PlayCircle size={20} /> <span>Vaylu</span></div>
          <div className="tabs">
            <TabBtn icon={Home} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
            <TabBtn icon={MessageSquare} label="Messages" active={tab === "messages"} onClick={() => setTab("messages")} />
            <TabBtn icon={PlayTab} label="Reels" active={tab === "reels"} onClick={() => setTab("reels")} />
          </div>
          <div className="row gap8">
            <button className={tab === "media" ? "tab tab--active" : "tab"} onClick={() => setTab("media")}>
              <ImageIcon size={16}/> Media
            </button>
            <img className="avatar" src={me.avatar} alt={me.name} style={{ cursor: "pointer" }} onClick={() => openProfile(me.id)} />
          </div>
        </div>
      </header>

      <main className="container shell">
        {tab === "home" && (
          <HomeFeed
            meId={me.id}
            posts={posts}
            setPosts={setPosts}
            followMap={followMap}
            followToggle={followToggle}
            openProfile={openProfile}
          />
        )}
        {tab === "messages" && <Messages />}
        {tab === "reels" && <Reels reels={reels} setReels={setReels} toggleReelLike={toggleReelLike} toggleReelSave={toggleReelSave} />}
        {tab === "media" && <MediaGallery items={mediaItems} />}
        {tab === "profile" && profileUserId && (
          <Profile
            userId={profileUserId}
            meId={me.id}
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

      <footer className="footer shell">Built with React, plain CSS, lucide-react, and framer-motion.</footer>
    </div>
  );
}
