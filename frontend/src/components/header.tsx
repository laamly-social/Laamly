
import { useLocation } from "react-router-dom";
import type { User } from "../types";
import TabBtn from "./nav/TabBtn";
import { Image as ImageIcon, Home, PlayCircle as PlayTab, Github, Podcast } from "lucide-react";
import Avatar from "./ui/Avatar";

interface HeaderProps {
   openProfile: (uid: string) => void;
   githubClientId: string | null;
   user: User | null;
}


export function Header({ openProfile: _openProfile, githubClientId, user }: HeaderProps) {
   const location = useLocation();

   const redirectUri = encodeURIComponent("http://localhost:8080/auth/github");
   const githubAuthUrl = githubClientId
      ? `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${redirectUri}`
      : undefined;

   // Extract first name from full name
   const getFirstName = (fullName: string) => {
      return fullName.split(' ')[0];
   };

   return (
      <header
         className="h-full top-0 bottom-0 left-0 bg-[#eeeeee66] dark:bg-[#11111166] py-4 border border-border dark:border-border-dark rounded-xl"
         style={{ backdropFilter: "blur(8px)" }}
      >
         <div className="flex flex-col h-full items-center justify-between">
            {/* TOP: Brand Name */}
            <a href="/" className="flex items-center">
               <h1 className="text-2xl font-bold text-black dark:text-white">
                  Laamly
               </h1>
            </a>
            {/* MIDDLE: Navigation Tabs */}
            <div className="flex flex-col items-stretch w-full px-4 space-y-2">
               <TabBtn icon={Home} label="Posts" active={location.pathname === "/home"} to="/home" />
               {/* <TabBtn icon={MessageSquare} label="Messages" active={location.pathname === "/messages"} to="/messages" /> */}
               <TabBtn icon={PlayTab} label="Reels" active={location.pathname === "/reels"} to="/reels" />
               <TabBtn icon={Podcast} label="Podcasts" active={location.pathname === "/podcasts"} to="/podcasts" />
            </div>
            {/* BOTTOM: User Profile */}
            <div className="flex flex-col items-center space-y-4">
               {user && (
                  <div className="w-full px-4">
                     <TabBtn icon={ImageIcon} label="Media" active={location.pathname === "/media"} to="/media" />
                  </div>
               )}


               {user && user.name ? (
                  <div className="w-full px-4 text-center flex flex-col items-center space-y-3">
                     <Avatar
                        src={user.avatar}
                        alt={user.name}
                        size="lg"
                        className="w-16 h-16"
                     />
                     <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                        Hi, {getFirstName(user.name)}!
                     </span>
                        <a
                           href="http://localhost:8080/logout"
                           className="transition-all py-2 px-4 w-full border bg-red-100 dark:bg-red-900 hover:bg-red-200 hover:dark:bg-red-800 border-red-300 dark:border-red-700 rounded-md text-red-700 dark:text-red-200 text-center block"
                        >
                           Log out
                        </a>
                  </div>
               ) : githubAuthUrl ? (
                  <div className="w-full px-4 my-6">
                        <a
                           href={githubAuthUrl}
                           className="transition-all py-3 px-4 my-2 w-full rounded-md border-2 border-white bg-black text-white"
                        >
                           <span className="fa fa-github"></span>GitHub login
                        </a>
                        <br />

               </div>
               ) : (
                  <div className="w-full px-4">
                           <span className="opacity-50 py-4 px-4 my-2 w-full border rounded-md">Loading <br /> GitHub login</span>

               </div>
               )}
            </div>
         </div>
      </header>
   );
}