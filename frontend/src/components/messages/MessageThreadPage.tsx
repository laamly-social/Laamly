import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import MessageThread from "./MessageThread";
import { fetchThreads } from "../../utils/messages";
import type { Thread } from "../../types";
import { getSocket } from "../../utils/socket";
import GenericButton from "../ui/GenericButton";

export default function MessageThreadPage() {
   const { threadId } = useParams<{ threadId: string }>();
   const navigate = useNavigate();
   const [thread, setThread] = useState<Thread | null>(null);
   const [loading, setLoading] = useState(true);
   const [typingUsers, setTypingUsers] = useState<string[]>([]);

   // Initialize Socket.IO
   useEffect(() => {
      const socket = getSocket();

      // Listen for new messages
      socket.on("new-message", (data: { threadId: string; message: any }) => {
         if (data.threadId === threadId) {
            setThread(prev => {
               if (!prev) return null;

               // Check if message already exists (avoid duplicates)
               const messageExists = prev.messages.some(m => m.id === data.message.id);
               if (messageExists) return prev;

               return {
                  ...prev,
                  messages: [...prev.messages, data.message],
                  last: data.message.text || `${data.message.attachments?.length || 0} file${(data.message.attachments && data.message.attachments.length !== 1 ? 's' : '')}`,
                  lastTs: data.message.ts
               };
            });
         }
      });

      // Listen for reactions
      socket.on("message-reaction", (data: { threadId: string; messageId: string; reactions: any[] }) => {
         if (data.threadId === threadId) {
            setThread(prev => {
               if (!prev) return null;
               return {
                  ...prev,
                  messages: prev.messages.map(m =>
                     m.id === data.messageId ? { ...m, reactions: data.reactions } : m
                  )
               };
            });
         }
      });

      // Listen for typing indicators
      socket.on("user-typing", (data: { threadId: string; userId: string; userName?: string; isTyping: boolean }) => {
         if (data.threadId === threadId) {
            const displayName = data.userName || data.userId || "Someone";
            setTypingUsers(prev => {
               if (data.isTyping && !prev.includes(displayName)) {
                  return [...prev, displayName];
               } else if (!data.isTyping) {
                  return prev.filter(name => name !== displayName);
               }
               return prev;
            });
         }
      });

      return () => {
         socket.off("new-message");
         socket.off("message-reaction");
         socket.off("user-typing");
      };
   }, [threadId]);

   // Join/leave thread room
   useEffect(() => {
      if (threadId) {
         const socket = getSocket();
         socket.emit("join-thread", threadId);
         return () => {
            socket.emit("leave-thread", threadId);
         };
      }
   }, [threadId]);

   // Load thread data
   useEffect(() => {
      (async () => {
         try {
            setLoading(true);
            const threads = await fetchThreads();
            const foundThread = threads.find(t => t.id === threadId);
            if (foundThread) {
               setThread(foundThread);
            } else {
               // Thread not found, redirect back to messages
               navigate("/messages");
            }
         } catch (error) {
            console.error("Failed to load thread:", error);
            navigate("/messages");
         } finally {
            setLoading(false);
         }
      })();
   }, [threadId, navigate]);

   const handleThreadUpdate = (updatedThread: Thread) => {
      setThread(updatedThread);
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center h-screen bg-bg dark:bg-bg-dark">
            <div className="text-text dark:text-text-dark">Loading conversation...</div>
         </div>
      );
   }

   if (!thread) {
      return (
         <div className="flex flex-col items-center justify-center h-screen bg-bg dark:bg-bg-dark p-4">
            <div className="text-text dark:text-text-dark mb-4">Conversation not found</div>
            <GenericButton
               onClick={() => navigate("/messages")}
               className="inline-flex gap-2 items-center justify-center bg-accent text-white hover:bg-accent/90 px-4 py-2 cursor-pointer"
            >
               <ChevronLeft size={18} /> Back to Messages
            </GenericButton>
         </div>
      );
   }

   return (
      <div className="h-[calc(100vh-5rem)] flex flex-col bg-bg dark:bg-bg-dark">
         {/* Mobile header with back button */}
         <div className="flex items-center gap-3 p-3 border-b border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
            <button
               onClick={() => navigate("/messages")}
               className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted dark:hover:bg-muted-dark transition"
               aria-label="Back to messages"
            >
               <ChevronLeft size={24} className="text-text dark:text-text-dark" />
            </button>
            <div className="flex-1">
               <h2 className="text-lg font-semibold text-text dark:text-text-dark">
                  {thread.isGroup && thread.groupName
                     ? thread.groupName
                     : thread.participants?.map(p => p.name).join(", ") || "Unknown"}
               </h2>
            </div>
         </div>

         {/* Message thread content */}
         <div className="flex-1 overflow-hidden">
            <MessageThread
               thread={thread}
               onThreadUpdate={handleThreadUpdate}
               typingUsers={typingUsers}
            />
         </div>
      </div>
   );
}
