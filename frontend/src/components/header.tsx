// src/components/header.tsx
import { useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import type { User } from "../types";
import TabBtn from "./nav/TabBtn";
import { Home, PlayCircle as PlayTab, Github, Podcast, MessageSquare, Bell, UserRound, MessageCircle } from "lucide-react";
import Avatar from "./ui/Avatar";
import { BACKEND_URL } from "../config";
import NotificationBell from "./notifications/NotificationBell";
import NotificationBadge from "./notifications/NotificationBadge";
import { NotificationsList } from "./notifications/NotificationsList";

interface HeaderProps {
  openProfile: (uid: string) => void;
  githubClientId: string | null;
  googleClientId: string | null;
  user: User | null;
}

export function Header({ openProfile, githubClientId, googleClientId, user }: HeaderProps) {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  const googleRedirectUri = useMemo(() => `${BACKEND_URL}/auth/google`, []);
  const githubRedirectUri = useMemo(() => `${BACKEND_URL}/auth/github`, []);

  const googleAuthUrl = useMemo(() => {
    if (!googleClientId) return undefined;
    const enc = encodeURIComponent(googleRedirectUri);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${enc}&response_type=code&scope=profile email`;
  }, [googleClientId, googleRedirectUri]);

  const githubAuthUrl = useMemo(() => {
    if (!githubClientId) return undefined;
    const enc = encodeURIComponent(githubRedirectUri);
    return `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${enc}&scope=user:email`;
  }, [githubClientId, githubRedirectUri]);

  const getFirstName = (fullName: string) => fullName.split(" ")[0];

  return (
    <>
      <header
        className="hidden md:flex h-full top-0 bottom-0 left-0 bg-[#eeeeee66] dark:bg-[#11111166] py-4 border border-border dark:border-border-dark rounded-xl"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <div className="flex flex-col h-full items-center justify-between w-full">
          <a href="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-black dark:text-white">Laamly</h1>
          </a>

          <div className="flex flex-col items-stretch w-full px-4 space-y-2">
            <TabBtn icon={Home} label="Posts" active={location.pathname === "/home"} to="/home" />
            {user && (<TabBtn icon={MessageSquare} label="Messages" active={location.pathname === "/messages"} to="/messages" />)}
            <TabBtn icon={PlayTab} label="Reels" active={location.pathname === "/reels"} to="/reels" />
            {/* <TabBtn icon={Podcast} label="Podcasts" active={location.pathname === "/podcasts"} to="/podcasts" /> */}
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="flex gap-2">
              {user && (
                <>
                  <a
                    href="/feedback"
                    className="flex items-center gap-1 px-2 py-2 rounded-xl transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 text-text dark:text-text-dark text-sm"
                    title="Send Feedback"
                  >
                    <MessageCircle size={20} />
                    <span className="ml-1">Feedback</span>
                  </a>
                  <span
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`relative flex items-center gap-1 px-2 py-2 rounded-xl transition-colors ${
                      showNotifications ? "bg-accent text-white" : "hover:bg-gray-200 dark:hover:bg-gray-700 text-text dark:text-text-dark"
                    }`}
                  >
                    <Bell size={20} />
                    <span className="absolute -right-1.5 -top-1">
                      <NotificationBadge />
                    </span>
                  </span>
                </>
              )}
            </div>

            {user && user.name ? (
              <div className="w-full px-4 text-center flex flex-col items-center space-y-3">
                <button onClick={() => openProfile(user.id)} className="cursor-pointer bg-transparent border-none p-0 transition-opacity hover:opacity-80">
                  <Avatar src={user.avatar} alt={user.name} size="lg" className="w-16 h-16" />
                </button>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg font-semibold text-text dark:text-text-dark">Hi, {getFirstName(user.name)}!</span>
                </div>
                <a
                  href={`${BACKEND_URL}/logout`}
                  className="transition-all py-2 px-4 w-full border bg-red-100 dark:bg-red-900 hover:bg-red-200 hover:dark:bg-red-800 border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-200 text-center block"
                >
                  Log out
                </a>
              </div>
            ) : githubAuthUrl ? (
              <div className="w-full">
                <a
                  href={githubAuthUrl}
                  aria-disabled={!githubAuthUrl}
                  className={`inline-block transition-all py-3 px-4 mt-1 w-full rounded-lg border-2 border-white bg-black text-white ${
                    !githubAuthUrl ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span className="fa fa-github"></span>GitHub login
                </a>
                <br />
                <a
                  href={googleAuthUrl}
                  aria-disabled={!googleAuthUrl}
                  className={`inline-block transition-all py-3 px-4 mt-1 w-full rounded-lg border-2 border-white bg-red-500 text-white ${
                    !googleAuthUrl ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span className="fa fa-google"></span>Google login
                </a>
              </div>
            ) : (
              <div className="w-full px-4">
                <span className="opacity-50 py-4 px-4 my-2 w-full border rounded-md">
                  Loading
                  <br /> GitHub login
                </span>
              </div>
            )}
          </div>
        </div>

        {user && showNotifications && (
          <div className="absolute bottom-0 left-[105%] h-full w-[25rem] bg-bg dark:bg-bg-dark py-4 border border-border dark:border-border-dark rounded-xl z-[100] flex flex-col">
            <div className="mx-4">
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl float-right">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <NotificationsList />
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#eeeeee] dark:bg-[#111111] border-t border-border dark:border-border-dark" style={{ backdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-around px-2 py-3">
          <a href="/home" className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${location.pathname === "/home" ? "text-accent" : "text-text dark:text-text-dark"}`}>
            <Home size={24} />
          </a>
          <a href="/reels" className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${location.pathname === "/reels" ? "text-accent" : "text-text dark:text-text-dark"}`}>
            <PlayTab size={24} />
          </a>
          {/* <a href="/podcasts" className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${location.pathname === "/podcasts" ? "text-accent" : "text-text dark:text-text-dark"}`}>
            <Podcast size={24} />
          </a> */}
          {user && (
            <a href="/messages" className={`flex items-center justify-center p-2 rounded-lg transition ${location.pathname === "/messages" ? "text-accent" : "text-text dark:text-text-dark"}`}>
              <MessageSquare />
            </a>
          )}
          {user && (
            <a href="/feedback" className={`flex items-center justify-center p-2 rounded-lg transition ${location.pathname === "/feedback" ? "text-accent" : "text-text dark:text-text-dark"}`}>
              <MessageCircle size={24} />
            </a>
          )}
          {user && (
            <a href="/notifications" className={`flex items-center justify-center p-2 rounded-lg transition ${location.pathname === "/notifications" ? "text-accent" : "text-text dark:text-text-dark"}`}>
              <NotificationBell />
            </a>
          )}
          {user && user.name ? (
            <button onClick={() => openProfile(user.id)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition ${location.pathname.startsWith("/profile") ? "text-accent" : "text-text dark:text-text-dark"}`}>
              <Avatar src={user.avatar} alt={user.name} size="sm" className="w-6 h-6" />
            </button>
          ) : (
            <a href="/logged-out" className="flex flex-col items-center justify-center p-2 rounded-lg text-text dark:text-text-dark">
              <UserRound size={24} />
            </a>
          )}
        </div>
      </nav>
    </>
  );
}
