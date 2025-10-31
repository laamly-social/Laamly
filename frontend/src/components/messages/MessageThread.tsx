import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, File, Video, Edit2, Trash2, SmilePlus } from "lucide-react";
import { clsx } from "../../utils";
import UserChip from "../ui/UserChip";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import { uploadFiles, getFileType } from "../../utils/uploads";
import { sendMessage as sendMessageAPI, reactToMessage, editMessage as editMessageAPI, deleteMessage } from "../../utils/messages";
import { getSocket } from "../../utils/socket";
import type { Thread, DM } from "../../types";

interface MessageThreadProps {
   thread: Thread;
   onThreadUpdate: (updatedThread: Thread) => void;
   typingUsers: string[];
}

export default function MessageThread({ thread, onThreadUpdate, typingUsers }: MessageThreadProps) {
   const [draft, setDraft] = useState("");
   const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
   const [uploading, setUploading] = useState(false);
   const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
   const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
   const endRef = useRef<HTMLDivElement | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const messageInputRef = useRef<HTMLInputElement>(null);
   const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const shouldFocusRef = useRef(false);

   const commonEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

   useEffect(() => {
      console.log("MessageThread - typingUsers prop updated:", typingUsers);
   }, [typingUsers]);

   // Focus input after uploading completes
   useEffect(() => {
      if (!uploading && shouldFocusRef.current) {
         shouldFocusRef.current = false;
         requestAnimationFrame(() => {
            messageInputRef.current?.focus();
         });
      }
   }, [uploading]);

   useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [thread.messages.length]);

   useEffect(() => {
      const handleClick = () => {
         setContextMenu(null);
         setShowEmojiPicker(null);
      };
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
   }, []);

   // Cleanup typing indicator on unmount
   useEffect(() => {
      return () => {
         if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
         }
         const socket = getSocket();
         socket.emit("typing-stop", { threadId: thread.id });
      };
   }, [thread.id]);

   const handleTyping = () => {
      const socket = getSocket();

      if (typingTimeoutRef.current) {
         clearTimeout(typingTimeoutRef.current);
      }

      console.log("Emitting typing-start for thread:", thread.id);
      socket.emit("typing-start", { threadId: thread.id });

      typingTimeoutRef.current = setTimeout(() => {
         console.log("Emitting typing-stop for thread:", thread.id);
         socket.emit("typing-stop", { threadId: thread.id });
      }, 2000);
   };

   const sendMessage = async () => {
      if ((!draft.trim() && selectedFiles.length === 0)) return;

      setUploading(true);
      shouldFocusRef.current = true;
      try {
         const socket = getSocket();
         if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
         }
         socket.emit("typing-stop", { threadId: thread.id });

         const attachments = selectedFiles.length > 0 ? await uploadFiles(selectedFiles) : [];

         const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

         const msg: DM = {
            id: tempId,
            from: "me",
            text: draft.trim(),
            ts: Date.now(),
            attachments: attachments.length > 0 ? attachments : undefined
         };

         const updatedThread = {
            ...thread,
            unread: false,
            messages: [...thread.messages, msg],
            last: msg.text || `${attachments.length} file${attachments.length > 1 ? 's' : ''}`,
            lastTs: msg.ts
         };
         onThreadUpdate(updatedThread);

         setDraft("");
         setSelectedFiles([]);

         const response = await sendMessageAPI(thread.id, msg.text, attachments);

         if (response.messageId) {
            const finalThread = {
               ...updatedThread,
               messages: updatedThread.messages.map(m =>
                  m.id === tempId ? { ...m, id: response.messageId } : m
               )
            };
            onThreadUpdate(finalThread);
         }
      } catch (error) {
         console.error("Failed to send message:", error);
      } finally {
         setUploading(false);
      }
   };

   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setSelectedFiles(prev => [...prev, ...files]);
      if (fileInputRef.current) {
         fileInputRef.current.value = '';
      }
   };

   const removeFile = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
   };

   const handleReaction = async (messageId: string, emoji: string) => {
      setShowEmojiPicker(null);

      try {
         await reactToMessage(thread.id, messageId, emoji);
      } catch (error) {
         console.error("Failed to react to message:", error);
      }
   };

   const handleEditMessage = async (messageId: string, newText: string) => {
      try {
         await editMessageAPI(thread.id, messageId, newText);
         setContextMenu(null);
      } catch (error) {
         console.error("Failed to edit message:", error);
      }
   };

   const handleDeleteMessage = async (messageId: string) => {
      if (!confirm("Are you sure you want to delete this message?")) return;
      try {
         await deleteMessage(thread.id, messageId);
         setContextMenu(null);
      } catch (error) {
         console.error("Failed to delete message:", error);
      }
   };

   const getThreadTitle = () => {
      if (thread.isGroup && thread.groupName) return thread.groupName;
      if (!thread.participants || thread.participants.length === 0) return "Unknown";
      return thread.participants.map(p => p.name).join(", ");
   };

   const getThreadAvatar = () => {
      if (!thread.participants || thread.participants.length === 0) return "";
      return thread.participants[0].avatar;
   };

   // Debug: Log thread ID on mount
   useEffect(() => {
      console.log("MessageThread mounted with thread ID:", thread.id);
      console.log("Thread participants:", thread.participants?.map(p => p.name));
   }, [thread.id]);

   return (
      <>
         <section className="flex flex-col bg-transparent overflow-hidden">
            <div className="sticky top-0 p-3 flex items-center justify-between bg-panel dark:bg-panel-dark border-b border-border dark:border-border-dark">
               <div className="flex items-center gap-2">
                  {thread.participants && thread.participants.length > 0 && (
                     <UserChip
                        fullName={getThreadTitle()}
                        avatar={getThreadAvatar()}
                        handle={thread.participants[0].handle}
                     />
                  )}
               </div>
               {/* DEBUG: Test typing indicator */}
               {import.meta.env.DEV && (
                  <button
                     onClick={() => {
                        console.log("Manual test: Emitting typing-start");
                        const socket = getSocket();
                        socket.emit("typing-start", { threadId: thread.id });
                        setTimeout(() => {
                           console.log("Manual test: Emitting typing-stop");
                           socket.emit("typing-stop", { threadId: thread.id });
                        }, 3000);
                     }}
                     className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                     title={`Typing users: ${JSON.stringify(typingUsers)}`}
                  >
                     Test Typing ({typingUsers.length})
                  </button>
               )}
               {/* <div className="flex items-center gap-2 text-sub dark:text-sub-dark">
            <button className="p-1 hover:text-text dark:hover:text-text-dark transition">
              <Bell size={18} />
            </button>
            <button className="p-1 hover:text-text dark:hover:text-text-dark transition">
              <MoreHorizontal size={18} />
            </button>
          </div> */}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 bg-[linear-gradient(180deg,#dadada_0%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#12141a_0%,#090a0d_100%)]">
               {thread.messages.map(m => {
                  const mine = m.from === "me";
                  return (
                     <div key={m.id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                        <div className="relative group max-w-[70%]">
                           <div>
                              <div
                                 className={clsx(
                                    "py-2 px-3.5 text-[15px] rounded-2xl relative break-words border shadow-sm",
                                    mine
                                       ? "bg-gradient-to-br from-blue-500 to-blue-600 border-accent-dark dark:border-accent text-white"
                                       : "bg-muted dark:bg-muted-dark border-border dark:border-border-dark text-gray-900 dark:text-gray-100"
                                 )}
                                 onContextMenu={(e) => {
                                    if (mine) {
                                       e.preventDefault();
                                       setContextMenu({ messageId: m.id, x: e.clientX, y: e.clientY });
                                    }
                                 }}
                              >
                                 {m.text && (
                                    <div className="whitespace-pre-wrap leading-[1.4]">
                                       {m.text}
                                       {m.edited && <span className="ml-2 text-[11px] opacity-60 italic">(edited)</span>}
                                       {/* time */}
                                       <span className={clsx("mx-2 font-mono")}>
                                          <time className={clsx("text-[11px] opacity-70")}>
                                             {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                          </time>
                                          {mine && m.read && <span className="text-[11px] opacity-70">✓✓</span>}
                                       </span>

                                    </div>
                                 )}
                                 {m.attachments && m.attachments.length > 0 && (
                                    <div className="flex flex-col gap-2 mt-2">
                                       {m.attachments.map((url, idx) => {
                                          const fileType = getFileType(url);
                                          return (
                                             <div key={idx}>
                                                {fileType === 'image' && (
                                                   <img
                                                      src={url}
                                                      alt="attachment"
                                                      className="max-w-full rounded-xl max-h-80 object-cover cursor-pointer hover:opacity-95 transition"
                                                      onClick={() => window.open(url, '_blank')}
                                                   />
                                                )}
                                                {fileType === 'video' && (
                                                   <video
                                                      src={url}
                                                      controls
                                                      className="max-w-full rounded-xl max-h-80"
                                                   />
                                                )}
                                                {fileType === 'file' && (
                                                   <a
                                                      href={url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className={clsx(
                                                         "flex items-center gap-2 p-2.5 rounded-lg transition",
                                                         mine ? "bg-white/15 hover:bg-white/25" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                      )}
                                                   >
                                                      <File size={20} />
                                                      <span className="text-sm">View file</span>
                                                   </a>
                                                )}
                                             </div>
                                          );
                                       })}
                                    </div>
                                 )}
                                 {!m.text && (
                                    <span className={clsx("mx-2 font-mono")}>
                                       <time className={clsx("text-[11px] opacity-70")}>
                                          {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                       </time>
                                       {mine && m.read && <span className="text-[11px] opacity-70">✓✓</span>}
                                    </span>

                                 )}
                              </div>

                           </div>

                           {m.reactions && m.reactions.length > 0 && (
                              <div className={clsx("flex flex-wrap gap-1 mt-1", mine ? "justify-end" : "justify-start")}>
                                 {Object.entries(
                                    m.reactions.reduce((acc, r) => {
                                       acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                       return acc;
                                    }, {} as Record<string, number>)
                                 ).map(([emoji, count]) => (
                                    <button
                                       key={emoji}
                                       onClick={() => handleReaction(m.id, emoji)}
                                       className={clsx(
                                          "px-2 py-1 rounded-xl text-sm flex items-center gap-1 transition-all",
                                          "border bg-muted dark:bg-muted-dark border-border dark:border-border-dark shadow-sm hover:shadow-md"
                                       )}
                                       title="Click to remove your reaction"
                                    >
                                       <span className="leading-none">{emoji}</span>
                                       {count > 1 && <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{count}</span>}
                                    </button>
                                 ))}
                              </div>
                           )}

                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id);
                              }}
                              className={clsx(
                                 "absolute top-0 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md",
                                 "opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 transform",
                                 mine ? "-left-10" : "-right-10"
                              )}
                              title="Add reaction"
                           >
                              <SmilePlus size={16} className="text-gray-600 dark:text-gray-400" />
                           </button>

                           {showEmojiPicker === m.id && (
                              <div
                                 onClick={(e) => e.stopPropagation()}
                                 className={clsx(
                                    "absolute z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 flex gap-1",
                                    mine ? "right-0 top-12" : "left-0 top-12"
                                 )}
                              >
                                 {commonEmojis.map(emoji => (
                                    <button
                                       key={emoji}
                                       onClick={() => handleReaction(m.id, emoji)}
                                       className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all transform hover:scale-125 text-xl"
                                       title={`React with ${emoji}`}
                                    >
                                       {emoji}
                                    </button>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}

               {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                     <div className="max-w-[70%] mt-6 py-3 px-4 rounded-[18px] bg-muted dark:bg-muted-dark border border-border dark:border-border-dark mx-auto">
                        <span className="text-sm text-sub dark:text-sub-dark mr-2">
                           {typingUsers.length === 1
                              ? `${typingUsers[0]} is typing`
                              : `${typingUsers.join(", ")} are typing`}
                        </span>
                        <span className="inline-flex gap-1">
                           <i className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block animate-[blip_1s_infinite]"></i>
                           <i className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block animate-[blip_1s_infinite_0.15s]"></i>
                           <i className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 inline-block animate-[blip_1s_infinite_0.3s]"></i>
                        </span>
                     </div>
                  </div>
               )}

               <div ref={endRef} />
            </div>

            <div className="p-2.5 flex flex-col gap-2 border-t border-border dark:border-border-dark bg-panel dark:bg-panel-dark">
               {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted dark:bg-muted-dark rounded-lg">
                     {selectedFiles.map((file, idx) => {
                        const isImage = file.type.startsWith('image/');
                        const isVideo = file.type.startsWith('video/');
                        return (
                           <div key={idx} className="relative group">
                              {isImage ? (
                                 <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-20 h-20 object-cover rounded-lg"
                                 />
                              ) : isVideo ? (
                                 <div className="w-20 h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <Video size={32} className="text-accent" />
                                 </div>
                              ) : (
                                 <div className="w-20 h-20 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <File size={32} className="text-accent" />
                                 </div>
                              )}
                              <button
                                 onClick={() => removeFile(idx)}
                                 className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                              >
                                 <X size={14} />
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 rounded-b-lg truncate">
                                 {file.name}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               )}

               <div className="flex gap-2">
                  <input
                     ref={fileInputRef}
                     type="file"
                     multiple
                     accept="image/*,video/*,.pdf,.doc,.docx"
                     onChange={handleFileSelect}
                     className="hidden"
                  />
                  <GenericButton
                     onClick={() => fileInputRef.current?.click()}
                     className="inline-flex gap-2 items-center justify-center bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark h-[40px] w-[40px] p-0 cursor-pointer"
                     aria-label="attach"
                     disabled={uploading}
                  >
                     <Paperclip size={18} />
                  </GenericButton>
                  {/* <GenericButton className="inline-flex gap-2 items-center justify-center bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark h-[40px] w-[40px] p-0 cursor-pointer" aria-label="emoji">
              <Smile size={18} />
            </GenericButton> */}
                  <InputField
                     ref={messageInputRef}
                     id={"message-input"}
                     className="input bg-muted dark:bg-muted-dark"
                     placeholder="Message..."
                     value={draft}
                     onChange={e => {
                        setDraft(e.target.value);
                        handleTyping();
                     }}
                     onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                           e.preventDefault();
                           sendMessage();
                        }
                     }}
                     disabled={uploading}
                  />
                  <GenericButton
                     className="inline-flex gap-2 items-center justify-center h-9 px-3 bg-accent text-white hover:bg-accent/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                     onClick={sendMessage}
                     disabled={uploading || (!draft.trim() && selectedFiles.length === 0)}
                  >
                     {uploading ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Uploading...
                        </>
                     ) : (
                        <>
                           <Send size={16} /> Send
                        </>
                     )}
                  </GenericButton>
               </div>
            </div>
         </section>

         {contextMenu && (
            <div
               className="fixed z-50 bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-lg shadow-xl py-1 min-w-[150px]"
               style={{ top: contextMenu.y, left: contextMenu.x }}
               onClick={(e) => e.stopPropagation()}
            >
               <button
                  onClick={() => {
                     const message = thread.messages.find(m => m.id === contextMenu.messageId);
                     if (message?.text) {
                        const newText = prompt("Edit message:", message.text);
                        if (newText && newText !== message.text) {
                           handleEditMessage(contextMenu.messageId, newText);
                        }
                     }
                     setContextMenu(null);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-muted dark:hover:bg-muted-dark flex items-center gap-2 text-text dark:text-text-dark"
               >
                  <Edit2 size={16} />
                  <span>Edit</span>
               </button>
               <button
                  onClick={() => handleDeleteMessage(contextMenu.messageId)}
                  className="w-full px-4 py-2 text-left hover:bg-muted dark:hover:bg-muted-dark flex items-center gap-2 text-red-600 dark:text-red-400"
               >
                  <Trash2 size={16} />
                  <span>Delete</span>
               </button>
            </div>
         )}
      </>
   );
}
