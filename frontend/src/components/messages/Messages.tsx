import GenericButton from "../ui/GenericButton";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import NewChatModal from "./NewChatModal";
import MessagesSidebar from "./MessagesSidebar";
import MessageThread from "./MessageThread";
import { createThread, fetchThreads } from "../../utils/messages";
import type { Thread } from "../../types";
import { getSocket } from "../../utils/socket";

export default function Messages() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<{ [threadId: string]: string[] }>({});
  const activeThread = threads.find(t => t.id === activeId);

  // Debug helper
  useEffect(() => {
    console.log("Messages - typingUsers state:", typingUsers);
    console.log("Messages - activeId:", activeId);
    console.log("Messages - typing users for active thread:", typingUsers[activeId]);
  }, [typingUsers, activeId]);

  // ✅ Initialize Socket.IO
  useEffect(() => {
    const socket = getSocket();
    console.log("Initializing socket listeners, socket ID:", socket.id);

    // Listen for new messages
    socket.on("new-message", (data: { threadId: string; message: any }) => {
      setThreads(prev => prev.map(t => {
        if (t.id === data.threadId) {
          // Check if message already exists (avoid duplicates)
          const messageExists = t.messages.some(m => m.id === data.message.id);
          if (messageExists) return t;

          return {
            ...t,
            messages: [...t.messages, data.message],
            last: data.message.text || `${data.message.attachments?.length || 0} file${(data.message.attachments && data.message.attachments.length !== 1 ? 's' : '')}`,
            lastTs: data.message.ts
          };
        }
        return t;
      }));
    });

    // Listen for reactions
    socket.on("message-reaction", (data: { threadId: string; messageId: string; reactions: any[] }) => {
      setThreads(prev => prev.map(t => {
        if (t.id === data.threadId) {
          return {
            ...t,
            messages: t.messages.map(m =>
              m.id === data.messageId ? { ...m, reactions: data.reactions } : m
            )
          };
        }
        return t;
      }));
    });

    // Listen for typing indicators
    socket.on("user-typing", (data: { threadId: string; userId: string; userName?: string; isTyping: boolean }) => {
      console.log("Received user-typing event:", data);
      setTypingUsers(prev => {
        const threadTyping = prev[data.threadId] || [];
        const displayName = data.userName || data.userId || "Someone";

        if (data.isTyping && !threadTyping.includes(displayName)) {
          console.log("Adding typing user:", displayName, "to thread:", data.threadId);
          return { ...prev, [data.threadId]: [...threadTyping, displayName] };
        } else if (!data.isTyping) {
          console.log("Removing typing user:", displayName, "from thread:", data.threadId);
          return { ...prev, [data.threadId]: threadTyping.filter(name => name !== displayName) };
        }
        return prev;
      });
    });

    return () => {
      socket.off("new-message");
      socket.off("message-reaction");
      socket.off("user-typing");
    };
  }, []);

  // ✅ Join/leave thread rooms
  useEffect(() => {
    if (activeId) {
      const socket = getSocket();
      console.log("Joining thread:", activeId);
      socket.emit("join-thread", activeId);
      return () => {
        console.log("Leaving thread:", activeId);
        socket.emit("leave-thread", activeId);
      };
    }
  }, [activeId]);

  // Load threads on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const fetchedThreads = await fetchThreads();
        setThreads(fetchedThreads);
        if (fetchedThreads.length > 0) {
          setActiveId(fetchedThreads[0].id);
        }
      } catch (error) {
        console.error("Failed to load threads:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setThreads(prev => prev.map(t => (t.id === activeId ? { ...t, unread: false } : t)));
  }, [activeId]);

  const handleCreateChat = async (
    userIds: string[],
    options?: { isGroup?: boolean; groupName?: string; groupAvatar?: string }
  ) => {
    try {
      const response = await createThread(userIds, options);
      const threadId = response.threadId || `t_${Date.now()}`;

      // Check if thread already exists in the list
      const existingThread = threads.find(t => t.id === threadId);

      if (existingThread) {
        // Thread already exists, just switch to it
        setActiveId(threadId);
        return;
      }

      // Create new thread entry
      const newThread: Thread = {
        id: threadId,
        participantIds: userIds,
        participants: response.participants || [],
        last: "",
        lastTs: Date.now(),
        messages: [],
        unread: false,
        ...(options?.isGroup && { isGroup: options.isGroup }),
        ...(options?.groupName && { groupName: options.groupName }),
        ...(options?.groupAvatar && { groupAvatar: options.groupAvatar }),
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveId(newThread.id);
    } catch (error) {
      console.error("Failed to create thread:", error);
      const newThread: Thread = {
        id: `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participantIds: userIds,
        participants: [],
        last: "",
        lastTs: Date.now(),
        messages: [],
        unread: false,
      };
      setThreads(prev => [newThread, ...prev]);
      setActiveId(newThread.id);
    }
  };

  const handleThreadUpdate = (updatedThread: Thread) => {
    setThreads(prev => prev.map(t => t.id === updatedThread.id ? updatedThread : t));
  };

  return (
    <>
      <div className="grid h-[calc(100vh-1rem)] w-[calc(100vw-12.5rem)] rounded-xl border border-border dark:border-border-dark overflow-hidden small:grid-cols-1 m-2 ml-0" style={{ gridTemplateColumns: "320px minmax(420px, 1fr)" }}>
        <MessagesSidebar
          threads={threads}
          activeId={activeId}
          searchQuery={searchQuery}
          loading={loading}
          onThreadSelect={setActiveId}
          onSearchChange={setSearchQuery}
          onNewMessage={() => setIsModalOpen(true)}
        />

        {activeThread ? (
          <MessageThread
            thread={activeThread}
            onThreadUpdate={handleThreadUpdate}
            typingUsers={typingUsers[activeId] || []}
          />
        ) : (
          <section className="flex flex-col bg-transparent overflow-hidden">
            <div className="flex-1 flex items-center justify-center bg-[linear-gradient(180deg,#dadada_0%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#12141a_0%,#090a0d_100%)]">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-text dark:text-text-dark mb-2">
                  Select a conversation
                </h3>
                <p className="text-sub dark:text-sub-dark mb-4">
                  Choose a conversation from the sidebar or start a new one
                </p>
                <GenericButton
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex gap-2 items-center justify-center bg-accent text-white hover:bg-accent/90 px-4 py-2 cursor-pointer"
                >
                  <Plus size={18} /> New Message
                </GenericButton>
              </div>
            </div>
          </section>
        )}
      </div>

      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateChat={handleCreateChat}
      />
    </>
  );
}
