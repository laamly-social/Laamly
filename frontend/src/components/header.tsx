
import GenericButton from "./ui/GenericButton";
import Avatar from "./ui/Avatar";
import type { User } from "../types";
import type { Tab } from "../types";
import TabBtn from "./nav/TabBtn";
import { Image as ImageIcon, Home, MessageSquare, PlayCircle as PlayTab } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchGithubClientId } from "../utils/github";
import { fetchMe } from "../utils/me";

interface HeaderProps {
   me: User;
   tab: Tab;
   setTab: (tab: Tab) => void;
   openProfile: (uid: string) => void;
}


export function Header({ me, tab, setTab, openProfile }: HeaderProps) {
   const [githubClientId, setGithubClientId] = useState<string | null>(null);
   const [user, setUser] = useState<User | null>(null);

   useEffect(() => {
      fetchGithubClientId().then(setGithubClientId).catch(() => setGithubClientId(null));
      fetchMe().then(setUser).catch(() => setUser(null));
   }, []);

   const redirectUri = encodeURIComponent("http://localhost:8080/auth/github");
   const githubAuthUrl = githubClientId
      ? `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}`
      : undefined;

   return (
      <header
         className="h-full top-0 bottom-0 left-0 bg-[#eeeeee66] dark:bg-[#11111166] py-4 border-1 border-border dark:border-border-dark rounded-xl"
         style={{ backdropFilter: "blur(8px)" }}
      >
         <div className="flex flex-col h-full items-center justify-between">
            {/* TOP: Brand Name */}
            <a href="/" className="flex items-center">
               <h1 className="text-2xl font-bold text-black dark:text-white">
                  Veylu
               </h1>
            </a>
            {/* MIDDLE: Navigation Tabs */}
            <div className="flex flex-col items-stretch w-full px-4 space-y-2">
               <TabBtn icon={Home} label="Home" active={tab === "home"} onClick={() => setTab("home")} />
               <TabBtn icon={MessageSquare} label="Messages" active={tab === "messages"} onClick={() => setTab("messages")} />
               <TabBtn icon={PlayTab} label="Reels" active={tab === "reels"} onClick={() => setTab("reels")} />
            </div>
            {/* BOTTOM: Media and User Profile */}
            <div className="flex flex-col items-center space-y-4">
               <GenericButton
                  className={"flex gap-2 items-center cursor-pointer py-2 px-3 text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark" + (tab === "media" ? " tab--active" : "")}
                  onClick={() => setTab("media")}
               >
                  <ImageIcon size={16} /> Media
               </GenericButton>
               <Avatar
                  src={me.avatar}
                  alt={me.name}
                  style={{ cursor: "pointer" }}
                  onClick={() => openProfile(me.id)}
               />
               <br />
               <br />
               {user && user.name ? (
                  <>
                     <span className="py-4 px-4 my-2 w-full text-center text-lg font-semibold text-green-700 dark:text-green-300">
                        Hi, {user.name}!
                     </span>
                     <a
                        href="http://localhost:8080/logout"
                        className="transition-all py-2 px-4 my-2 w-full border bg-red-100 dark:bg-red-900 hover:bg-red-200 hover:dark:bg-red-800 border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-200 text-center"
                     >
                        Log out
                     </a>
                  </>
               ) : githubAuthUrl ? (
                  <a
                     href={githubAuthUrl}
                     className="transition-all py-4 px-4 my-2 w-full border bg-close-light dark:bg-close-dark hover:bg-close-h-light hover:dark:bg-close-h-dark border-close-b-light dark:border-close-b-dark rounded-md"
                  >
                     <span className="fa fa-github"></span> Sign in with GitHub
                  </a>
               ) : (
                  <span className="opacity-50 py-4 px-4 my-2 w-full border rounded-md">Loading GitHub login…</span>
               )}
            </div>
         </div>
      </header>
   );
}