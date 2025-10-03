import GenericButton from "./ui/GenericButton";
import Avatar from "./ui/Avatar";

import type { User } from "../types";
import type { Tab } from "../types";
import TabBtn from "./nav/TabBtn";
import { Image as ImageIcon, Home, MessageSquare, PlayCircle as PlayTab } from "lucide-react";

interface HeaderProps {
   me: User;
   tab: Tab;
   setTab: (tab: Tab) => void;
   openProfile: (uid: string) => void;
}

export function Header({ me, tab, setTab, openProfile }: HeaderProps) {
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
            </div>

         </div>
      </header>
   );
}