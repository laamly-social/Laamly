import { useState, useEffect } from "react";
import { createComment } from "../../utils/comments";
import { fetchMe } from "../../utils/me";
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
   const [currentUser, setCurrentUser] = useState<any>(null);

   useEffect(() => {
      // Fetch current user info for new comments
      fetchMe().then(user => setCurrentUser(user)).catch(err => console.error("Failed to fetch user:", err));
   }, []);

   const addComment = async () => {
      if (!draft.trim()) return;
      const text = draft.trim();

      try {
         const data = await createComment(post._id!, text);
         if (data.comments) {
            setComments(data.comments.map((c: any) => {
               // If authorInfo is missing (newly created comment), use current user
               const authorInfo = c.authorInfo || currentUser;
               return {
                  ...c,
                  text: c.content || c.text, // normalize field
                  ts: c.datePosted || c.ts,
                  authorInfo: authorInfo,
               };
            }));
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

   return (
      <div className="grid gap-2.5">
         {comments.map((c, idx) => {
            const u = (c as any).authorInfo;
            if (u?.deleted) {
               return (
                  <div key={c._id || idx} className="flex gap-2">
                     <div className="comment bg-muted dark:bg-muted-dark rounded-xl border-1 border-border dark:border-border-dark flex-1 px-4 py-2">
                        <div className="flex justify-between text-text dark:text-text-dark text-xs mb-3">
                           <div>
                              <span className="font-semibold text-sub">[deleted]</span>
                           </div>
                           <span className="opacity-[.75]">
                              {c.ts ? new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                           </span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap mb-2">{c.text}</div>
                     </div>
                  </div>
               );
            }
            return (
               <div key={c._id || idx} className="flex gap-2">
                  <div className="comment bg-muted dark:bg-muted-dark rounded-xl border-1 border-border dark:border-border-dark flex-1 px-4 py-2">
                     <div className="flex justify-between text-text dark:text-text-dark text-xs mb-3">
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
                     <div className="mt-1 whitespace-pre-wrap mb-2">{c.text}</div>
                  </div>
               </div>
            );
         })}

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
               className="btn disabled:bg-muted disabled:dark:bg-muted-dark disabled:text-sub dark:disabled:text-sub-dark"
               disabled={!draft.trim()}
               onClick={addComment}
            >
               Post
            </GenericButton>
         </div>
      </div>
   );
}
