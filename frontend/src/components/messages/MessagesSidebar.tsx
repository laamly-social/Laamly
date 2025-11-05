import { Search, Plus } from "lucide-react";
import { clsx, formatTime } from "../../utils";
import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import type { Thread } from "../../types";

interface MessagesSidebarProps {
   threads: Thread[];
   activeId: string;
   searchQuery: string;
   loading: boolean;
   onThreadSelect: (threadId: string) => void;
   onSearchChange: (query: string) => void;
   onNewMessage: () => void;
}

export default function MessagesSidebar({
   threads,
   activeId,
   searchQuery,
   loading,
   onThreadSelect,
   onSearchChange,
   onNewMessage,
}: MessagesSidebarProps) {
   const filteredThreads = threads.filter(t => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const participantNames = t.participants?.map(p => p.name.toLowerCase() + " " + p.handle.toLowerCase()).join(" ") || "";
      return participantNames.includes(query) || t.last.toLowerCase().includes(query);
   });

   const getThreadTitle = (thread: Thread) => {
      if (thread.isGroup && thread.groupName) return thread.groupName;
      if (!thread.participants || thread.participants.length === 0) return "Unknown";
      return thread.participants.map(p => p.name).join(", ");
   };

   const getThreadAvatar = (thread: Thread) => {
      if (!thread.participants || thread.participants.length === 0) return "";
      return thread.participants[0].avatar;
   };

   return (
      <aside className="border-r border-border dark:border-border-dark bg-panel dark:bg-panel-dark flex flex-col w-full max-w-full overflow-hidden">
         <div className="sticky top-0 bg-panel dark:bg-panel-dark p-2.5 flex flex-col gap-2 z-10">
            <div className="flex items-center gap-2 w-full">
               <h2 className="text-lg font-semibold text-text dark:text-text-dark flex-1 truncate">Messages</h2>
               <GenericButton
                  onClick={onNewMessage}
                  className="inline-flex gap-2 items-center justify-center bg-accent text-white hover:bg-accent/90 h-[36px] w-[36px] min-w-[36px] p-0 cursor-pointer flex-shrink-0"
                  aria-label="New message"
               >
                  <Plus size={20} />
               </GenericButton>
            </div>
            <div className="flex items-center gap-2 bg-muted dark:bg-muted-dark rounded-xl px-3 py-2 w-full">
               <Search size={18} className="text-sub dark:text-sub-dark flex-shrink-0" />
               <input
                  type="text"
                  placeholder="Search DMs"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark text-sm min-w-0"
               />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {loading ? (
               <div className="p-4 text-center text-sub dark:text-sub-dark">
                  Loading conversations...
               </div>
            ) : filteredThreads.length === 0 ? (
               <div className="p-4 text-center text-sub dark:text-sub-dark">
                  {searchQuery ? "No conversations found" : "No messages yet"}
               </div>
            ) : (
               filteredThreads.map(t => {
                  const isActive = activeId === t.id;
                  return (
                     <div
                        key={t.id}
                        className={clsx(
                           "flex items-center gap-3 p-3 cursor-pointer transition hover:bg-muted dark:hover:bg-muted-dark border-l-4",
                           isActive
                              ? "bg-muted dark:bg-muted-dark border-accent"
                              : "border-transparent"
                        )}
                        onClick={() => onThreadSelect(t.id)}
                     >
                        <div className="relative flex-shrink-0">
                           <Avatar src={getThreadAvatar(t)} alt={getThreadTitle(t)} size="sm" />
                           {/* {t.unread && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-panel dark:border-panel-dark" />
                           )} */}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-0.5">
                              <div className="font-semibold text-text dark:text-text-dark truncate">
                                 {getThreadTitle(t)}
                              </div>
                              {t.lastTs && (
                                 <div className="text-xs text-sub dark:text-sub-dark ml-2 flex-shrink-0">
                                    {formatTime(t.lastTs)}
                                 </div>
                              )}
                           </div>
                           <div className="text-sm text-sub dark:text-sub-dark truncate">
                              {t.last || "No messages yet"}
                           </div>
                        </div>
                     </div>
                  );
               })
            )}
         </div>
      </aside>
   );
}
