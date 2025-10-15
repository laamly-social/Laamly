import { useState } from "react";
import { createComment } from "../../utils/comments";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import type { Post as PostType } from "../../types";
import UserChip from "../ui/UserChip";

export default function CommentsList({ post, onAdd }: { post: PostType; onAdd?: (postId: string, body: string) => void }) {
   const [draft, setDraft] = useState("");
   const [comments, setComments] = useState(() => {
      // Normalize initial comments
      return (post.comments || []).map((c: any) => ({
         ...c,
         text: c.content || c.text,
         ts: c.datePosted || c.ts,
      }));
   });

   const addComment = async () => {
      if (!draft.trim()) return;
      const text = draft.trim();

      try {
         const data = await createComment(post._id!, text);
         if (data.currentUser) {
            // Create new comment object with current user info
            const newComment = {
               _id: `temp_${Date.now()}`,
               author: data.currentUser.id,
               content: text,
               text: text,
               datePosted: new Date().toISOString(),
               ts: Date.now(),
               stats: {},
               authorInfo: {
                  handle: data.currentUser.handle,
                  name: data.currentUser.name,
                  avatar: data.currentUser.avatar,
                  isCurrentUser: true,
               }
            };

            // Append new comment to existing comments
            setComments(prev => [...prev, newComment]);
            setDraft("");

            // Notify parent component to update its state as well
            if (onAdd) {
               onAdd(post._id!, text);
            }
         } else {
            console.error("Failed to add comment:", data.message || "Unknown error");
         }
      } catch (err) {
         console.error("Error adding comment:", err);
      }
   };

   if (comments.length === 0 && !onAdd) return "<div></div>";
   return (
      <div className="grid gap-2.5">
         <div className="bg-muted dark:bg-muted-dark rounded-xl border border-border dark:border-border-dark">
            {comments.map((c, idx) => {
               const u = (c as any).authorInfo;
               if (u?.deleted) { return (<div key={c._id || idx}></div>); }
               const isLast = idx === comments.length - 1;
               return (
                  <div key={c._id || idx} className="flex gap-2">
                     <div className={`comment ${isLast ? '' : 'border-b'} border-border dark:border-border-dark flex-1 px-6 py-4`}>
                        <div className="flex justify-between text-text dark:text-text-dark text-xs mb-1">
                           <div>
                              <UserChip
                                 avatar={u?.avatar}
                                 handle={u?.handle ?? c.author}
                                 fullName={u?.name ?? c.author}
                              />
                           </div>
                           <span className="opacity-[.75]">
                              {c.ts ? new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                           </span>
                        </div>
                        <div className="mt-1 ml-13 mb-1 whitespace-pre-wrap">{c.text}</div>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="flex gap-2">
            <InputField
               id={`cbox-${post._id}`}
               className="input bg-muted dark:bg-muted-dark"
               placeholder="Write a comment…"
               value={draft}
               onChange={e => setDraft(e.target.value)}
               onKeyDown={e => {
                  if (e.key === "Enter") {
                     e.preventDefault();
                     addComment();
                  }
               }}
            />
            <GenericButton
               className="inline-flex gap-2 items-center justify-center h-9 px-3 bg-accent text-white cursor-pointer disabled:bg-muted disabled:dark:bg-muted-dark disabled:text-sub dark:disabled:text-sub-dark"
               disabled={!draft.trim()}
               onClick={addComment}
            >
               Post
            </GenericButton>
         </div>
      </div>
   );
}
